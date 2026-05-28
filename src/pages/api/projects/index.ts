import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === 'GET') {
    try {
      const projects = await prisma.project.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { tasks: true } },
          attachments: true,
          statuses: true,
          tasks: {
            select: {
              id: true,
              deadline: true,
              status: { select: { name: true } },
              assignee: { select: { id: true, name: true, email: true } },
            },
          },
        }
      });
      return res.status(200).json(projects);
    } catch (error) {
      console.error("GET projects error:", error);
      return res.status(500).json({ error: "Failed to fetch projects" });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, prefix, attachmentIds, startDate, deadline } = req.body;
      if (!name || !prefix) return res.status(400).json({ error: "Name and Prefix are required" });
      if (!startDate || !deadline) return res.status(400).json({ error: "Start date and deadline are required" });

      const defaultStatuses = [
        { name: 'Backlog', color: '#64748b', order: 1 },
        { name: 'To Do', color: '#3b82f6', order: 2 },
        { name: 'In Progress', color: '#f59e0b', order: 3 },
        { name: 'Review', color: '#8b5cf6', order: 4 },
        { name: 'Testing', color: '#ec4899', order: 5 },
        { name: 'QA', color: '#10b981', order: 6 },
        { name: 'Done', color: '#22c55e', order: 7 },
        { name: 'Blocked', color: '#ef4444', order: 8 },
        { name: 'Cancelled', color: '#94a3b8', order: 9 },
      ];

      const project = await prisma.project.create({
        data: { 
          name, 
          description, 
          prefix,
          startDate: startDate ? new Date(startDate) : null,
          deadline: deadline ? new Date(deadline) : null,
          statuses: {
            create: defaultStatuses
          },
          attachments: {
            connect: (attachmentIds || []).map((id: string) => ({ id }))
          }
        }
      });
      return res.status(200).json(project);
    } catch (error) {
      console.error("POST project error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).end();
}
