import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query; // taskId
  const taskId = String(id);

  if (req.method === 'POST') {
    try {
      const { hours, notes, date } = req.body;
      const parsedHours = parseFloat(hours);

      if (isNaN(parsedHours) || parsedHours <= 0) {
        return res.status(400).json({ error: "Valid hours are required" });
      }

      // Create worklog
      const worklog = await prisma.worklog.create({
        data: {
          taskId,
          userId: session.userId,
          hours: parsedHours,
          notes: notes || null,
          date: date ? new Date(date) : new Date(),
        },
        include: { user: { select: { name: true, email: true } } }
      });

      // Update task loggedTime
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task) {
        await prisma.task.update({
          where: { id: taskId },
          data: { loggedTime: (task.loggedTime || 0) + parsedHours }
        });
        
        await prisma.taskHistory.create({
          data: {
            taskId,
            userId: session.userId,
            oldStatus: "Logged time",
            newStatus: `Added ${parsedHours}h`,
          }
        });
      }

      return res.status(200).json(worklog);
    } catch (error) {
      console.error("POST worklog error:", error);
      return res.status(500).json({ error: "Failed to create worklog" });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { worklogId } = req.body;
      const worklog = await prisma.worklog.findUnique({ where: { id: worklogId } });
      if (!worklog) return res.status(404).json({ error: "Worklog not found" });

      if (worklog.userId !== session.userId && session.role !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden" });
      }

      await prisma.worklog.delete({ where: { id: worklogId } });

      // Update task loggedTime
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task) {
        await prisma.task.update({
          where: { id: taskId },
          data: { loggedTime: Math.max(0, (task.loggedTime || 0) - worklog.hours) }
        });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DELETE worklog error:", error);
      return res.status(500).json({ error: "Failed to delete worklog" });
    }
  }

  return res.status(405).end();
}