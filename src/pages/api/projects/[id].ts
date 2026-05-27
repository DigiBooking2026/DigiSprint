import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  const projectId = String(id);

  if (req.method === 'DELETE') {
    try {
      if (session.role !== 'ADMIN') {
        return res.status(403).json({ error: "Only admins can delete projects" });
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { deletedAt: new Date() }
      });

      return res.status(200).json({ message: "Project soft-deleted successfully" });
    } catch (error) {
      console.error("DELETE project error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).end();
}
