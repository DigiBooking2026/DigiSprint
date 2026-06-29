import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === 'GET') {
    const { id: projectId, sprintId } = req.query;

    try {
      const sprint = await prisma.sprint.findUnique({
        where: { id: String(sprintId) }
      });

      if (!sprint) {
        return res.status(404).json({ error: "Sprint not found" });
      }

      if (!sprint.startDate || !sprint.endDate) {
        return res.status(400).json({ error: "Sprint must have a start and end date for burndown calculation." });
      }

      // Fetch all tasks in this sprint
      const tasks = await prisma.task.findMany({
        where: { sprintId: String(sprintId) },
        include: {
          status: true,
          history: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
      
      const start = new Date(sprint.startDate);
      const end = new Date(sprint.endDate);
      const today = new Date();
      
      // Calculate total days (inclusive)
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
      const pointsPerDay = totalPoints / (totalDays > 1 ? totalDays - 1 : 1);

      const burndownData = [];
      
      const isDoneStatus = (statusName: string) => {
        const lower = statusName.toLowerCase();
        return lower.includes('done') || lower.includes('completed') || lower.includes('closed') || lower.includes('resolved');
      };

      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        
        // Stop calculating actuals for future dates
        if (currentDate > today) {
          burndownData.push({
            date: currentDate.toISOString().split('T')[0],
            ideal: Math.max(0, totalPoints - (pointsPerDay * i)),
            actual: null,
          });
          continue;
        }

        // Calculate actual remaining points at the END of this day
        // We look at the history of each task to determine its status at the end of the current date
        const currentEndOfDay = new Date(currentDate);
        currentEndOfDay.setHours(23, 59, 59, 999);

        let dayRemainingPoints = 0;
        
        for (const task of tasks) {
          let wasDoneAtEndOfDay = false;

          if (task.createdAt > currentEndOfDay) {
            // Task didn't exist yet, but we usually count all points in the sprint backlog.
            wasDoneAtEndOfDay = false;
          } else {
            // Find the last status transition before the end of the day
            const relevantHistory = task.history.filter(h => 
              h.createdAt <= currentEndOfDay && 
              h.newStatus // Only care about status changes
            );

            if (relevantHistory.length > 0) {
              const lastTransition = relevantHistory[relevantHistory.length - 1];
              wasDoneAtEndOfDay = isDoneStatus(lastTransition.newStatus);
            } else {
              // No history before this day, what was its initial status?
              wasDoneAtEndOfDay = isDoneStatus(task.status.name) && task.history.length === 0;
            }
          }

          if (!wasDoneAtEndOfDay) {
            dayRemainingPoints += (task.storyPoints || 0);
          }
        }

        burndownData.push({
          date: currentDate.toISOString().split('T')[0],
          ideal: Math.max(0, totalPoints - (pointsPerDay * i)),
          actual: dayRemainingPoints,
        });
      }

      return res.status(200).json(burndownData);
    } catch (error) {
      console.error("GET burndown error:", error);
      return res.status(500).json({ error: "Failed to calculate burndown" });
    }
  }

  return res.status(405).end();
}
