import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const projects = await prisma.project.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { tasks: true } },
          statuses: true,
        }
      });
      return res.status(200).json(projects);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to fetch projects", details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, prefix, startDate, deadline, isPrivate, ownerId } = req.body;
      if (!name || !prefix) return res.status(400).json({ error: "Name and Prefix are required" });

      // Find an owner
      let resolvedOwnerId = ownerId;
      if (!resolvedOwnerId) {
        const fallbackUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) || await prisma.user.findFirst();
        if (!fallbackUser) {
          return res.status(400).json({ error: "No users exist in the database. Please create a user first." });
        }
        resolvedOwnerId = fallbackUser.id;
      }

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
          description: description || "", 
          prefix,
          startDate: startDate ? new Date(startDate) : null,
          deadline: deadline ? new Date(deadline) : null,
          ownerId: resolvedOwnerId,
          isPrivate: Boolean(isPrivate),
          statuses: {
            create: defaultStatuses
          }
        },
        include: {
          statuses: true
        }
      });
      return res.status(200).json(project);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to create project", details: error.message });
    }
  }

  return res.status(405).end();
}
