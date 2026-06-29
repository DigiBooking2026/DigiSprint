import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  const releaseId = String(id);

  if (req.method === 'PATCH') {
    try {
      const { name, description, releaseDate, status } = req.body;
      const release = await prisma.release.update({
        where: { id: releaseId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(releaseDate !== undefined && { releaseDate: releaseDate ? new Date(releaseDate) : null }),
          ...(status !== undefined && { status }),
        }
      });
      return res.status(200).json(release);
    } catch (error) {
      console.error("PATCH release error:", error);
      return res.status(500).json({ error: "Failed to update release" });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.release.delete({ where: { id: releaseId } });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DELETE release error:", error);
      return res.status(500).json({ error: "Failed to delete release" });
    }
  }

  return res.status(405).end();
}
