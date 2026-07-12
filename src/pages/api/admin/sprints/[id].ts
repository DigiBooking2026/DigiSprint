import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const sprintId = String(id);

  if (req.method === 'GET') {
    try {
      const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        include: { _count: { select: { tasks: true } } },
      });
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
      return res.status(200).json(sprint);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to get sprint', details: error.message });
    }
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const { name, goal, startDate, endDate, status } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (goal !== undefined) data.goal = goal;
      if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
      if (status !== undefined) data.status = status;

      const sprint = await prisma.sprint.update({ where: { id: sprintId }, data });
      return res.status(200).json(sprint);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to update sprint', details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.sprint.delete({ where: { id: sprintId } });
      return res.status(200).json({ message: 'Sprint deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to delete sprint', details: error.message });
    }
  }

  return res.status(405).end();
}
