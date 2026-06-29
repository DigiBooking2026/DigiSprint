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
      const releases = await prisma.release.findMany({
        where: { projectId },
        include: {
          tasks: { select: { id: true, storyPoints: true, status: { select: { name: true } } } }
        },
        orderBy: { createdAt: "desc" }
      });
      return res.status(200).json(releases);
    } catch (error) {
      console.error("GET releases error:", error);
      return res.status(500).json({ error: "Failed to fetch releases" });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, releaseDate, status } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });

      const release = await prisma.release.create({
        data: {
          name,
          description: description || null,
          releaseDate: releaseDate ? new Date(releaseDate) : null,
          status: status || "UNRELEASED",
          projectId
        }
      });
      return res.status(200).json(release);
    } catch (error) {
      console.error("POST release error:", error);
      return res.status(500).json({ error: "Failed to create release" });
    }
  }

  return res.status(405).end();
}
