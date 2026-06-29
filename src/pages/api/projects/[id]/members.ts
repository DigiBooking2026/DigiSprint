import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  const projectId = String(id);

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (req.method === 'GET') {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          members: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      });
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.status(200).json(project.members);
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Adding or removing members requires ADMIN or Project Owner permissions
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  });

  if (!project) return res.status(404).json({ error: "Project not found" });

  if (currentUser?.role !== 'ADMIN' && project.ownerId !== session.userId) {
    return res.status(403).json({ error: "Only project owner or admin can manage members" });
  }

  if (req.method === 'POST') {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "User ID is required" });

      await prisma.project.update({
        where: { id: projectId },
        data: {
          members: {
            connect: { id: userId }
          }
        }
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Add member error:", error);
      return res.status(500).json({ error: "Failed to add member" });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') return res.status(400).json({ error: "User ID is required" });

      await prisma.project.update({
        where: { id: projectId },
        data: {
          members: {
            disconnect: { id: userId }
          }
        }
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Remove member error:", error);
      return res.status(500).json({ error: "Failed to remove member" });
    }
  }

  return res.status(405).end();
}
