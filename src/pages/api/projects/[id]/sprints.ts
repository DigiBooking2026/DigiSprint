import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query; // projectId
  const projectId = String(id);

  if (req.method === 'GET') {
    try {
      const sprints = await prisma.sprint.findMany({
        where: { projectId },
        include: {
          tasks: { select: { id: true, storyPoints: true, status: { select: { name: true } } } }
        },
        orderBy: { createdAt: "desc" }
      });
      return res.status(200).json(sprints);
    } catch (error) {
      console.error("GET sprints error:", error);
      return res.status(500).json({ error: "Failed to fetch sprints" });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, goal, startDate, endDate, status } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });

      const sprint = await prisma.sprint.create({
        data: {
          name,
          goal: goal || null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          status: status || "PLANNED",
          projectId
        }
      });
      return res.status(200).json(sprint);
    } catch (error) {
      console.error("POST sprint error:", error);
      return res.status(500).json({ error: "Failed to create sprint" });
    }
  }

  return res.status(405).end();
}