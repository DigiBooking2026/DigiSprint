import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

// Admin CRUD for Sprints (no session auth), mirroring the statuses/tasks admin routes.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  if (req.method === 'GET') {
    try {
      const sprints = await prisma.sprint.findMany({
        where: projectId ? { projectId: String(projectId) } : undefined,
        orderBy: { startDate: 'asc' },
        include: { _count: { select: { tasks: true } } },
      });
      return res.status(200).json(sprints);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch sprints', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, goal, startDate, endDate, status, projectId: bodyProjectId } = req.body;
      const pid = projectId || bodyProjectId;
      if (!name || !pid) return res.status(400).json({ error: 'name and projectId are required' });

      const sprint = await prisma.sprint.create({
        data: {
          name,
          goal: goal ?? null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          status: status || 'PLANNED', // PLANNED, ACTIVE, COMPLETED
          projectId: String(pid),
        },
      });
      return res.status(200).json(sprint);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to create sprint', details: error.message });
    }
  }

  return res.status(405).end();
}
