import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === 'GET') {
    try {
      const [histories, comments, worklogs] = await Promise.all([
        prisma.taskHistory.findMany({
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, email: true } },
            task: { select: { id: true, ticketId: true, title: true, projectId: true } }
          }
        }),
        prisma.comment.findMany({
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, email: true } },
            task: { select: { id: true, ticketId: true, title: true, projectId: true } }
          }
        }),
        prisma.worklog.findMany({
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, email: true } },
            task: { select: { id: true, ticketId: true, title: true, projectId: true } }
          }
        })
      ]);

      // Combine and format the activities
      const activities = [
        ...histories.map(h => ({
          id: `h_${h.id}`,
          type: 'history',
          user: h.user,
          task: h.task,
          action: h.oldStatus === 'Task edited' || h.oldStatus === 'Edit' 
            ? 'edited the task' 
            : h.oldStatus === 'Owner changed' || h.oldStatus === 'Assignee changed' 
              ? h.oldStatus.toLowerCase()
              : 'changed status',
          details: h.oldStatus === 'Task edited' || h.oldStatus === 'Edit' 
            ? h.newStatus 
            : h.oldStatus === 'Owner changed' || h.oldStatus === 'Assignee changed'
              ? h.newStatus
              : `from ${h.oldStatus || 'Created'} to ${h.newStatus}`,
          createdAt: h.createdAt
        })),
        ...comments.map(c => ({
          id: `c_${c.id}`,
          type: 'comment',
          user: c.user,
          task: c.task,
          action: 'commented on',
          details: c.content, // Since content is HTML from RichTextEditor, we'll strip tags or render it safely
          createdAt: c.createdAt
        })),
        ...worklogs.map(w => ({
          id: `w_${w.id}`,
          type: 'worklog',
          user: w.user,
          task: w.task,
          action: 'logged time on',
          details: `${w.hours}h logged${w.notes ? ` - ${w.notes}` : ''}`,
          createdAt: w.createdAt
        }))
      ];

      // Sort by descending createdAt
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Return top 100 recent activities
      return res.status(200).json(activities.slice(0, 100));
    } catch (error) {
      console.error("GET activity error:", error);
      return res.status(500).json({ error: "Failed to fetch activity stream" });
    }
  }

  return res.status(405).end();
}
