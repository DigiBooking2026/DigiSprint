import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === 'GET') {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(200).json({ tasks: [], projects: [] });
    }

    try {
      const query = q.trim();
      
      const [tasks, projects] = await Promise.all([
        prisma.task.findMany({
          where: {
            OR: [
              { title: { contains: query } },
              { ticketId: { contains: query } },
              { description: { contains: query } }
            ]
          },
          include: {
            status: true,
            project: { select: { name: true } }
          },
          take: 10
        }),
        prisma.project.findMany({
          where: {
            OR: [
              { name: { contains: query } },
              { prefix: { contains: query } }
            ]
          },
          take: 5
        })
      ]);

      return res.status(200).json({ tasks, projects });
    } catch (error) {
      console.error("GET search error:", error);
      return res.status(500).json({ error: "Failed to perform search" });
    }
  }

  return res.status(405).end();
}
