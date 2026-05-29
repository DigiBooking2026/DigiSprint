import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  const sprintId = String(id);

  if (req.method === 'PATCH') {
    try {
      const { name, goal, startDate, endDate, status } = req.body;
      const sprint = await prisma.sprint.update({
        where: { id: sprintId },
        data: {
          name,
          goal,
          startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
          endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
          status
        }
      });
      return res.status(200).json(sprint);
    } catch (error) {
      console.error("PATCH sprint error:", error);
      return res.status(500).json({ error: "Failed to update sprint" });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.sprint.delete({ where: { id: sprintId } });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DELETE sprint error:", error);
      return res.status(500).json({ error: "Failed to delete sprint" });
    }
  }

  return res.status(405).end();
}