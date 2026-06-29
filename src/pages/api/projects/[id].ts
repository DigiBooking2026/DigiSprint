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
      const project = await prisma.project.findFirst({
        where: { id: projectId, deletedAt: null },
        include: {
          attachments: true,
          statuses: true,
          members: { select: { id: true, name: true, email: true } },
          tasks: {
            include: {
              status: true,
              assignee: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.status(200).json(project);
    } catch (error) {
      console.error("GET project error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { name, description, prefix, startDate, deadline, attachmentIds, ownerId, isPrivate } = req.body;
      if (!name || !prefix) return res.status(400).json({ error: "Name and Prefix are required" });
      if (!startDate || !deadline) return res.status(400).json({ error: "Start date and deadline are required" });

      const updateData: any = {
        name,
        description,
        prefix,
        startDate: new Date(startDate),
        deadline: new Date(deadline),
        isPrivate: typeof isPrivate === 'boolean' ? isPrivate : undefined,
        attachments: attachmentIds
          ? { set: attachmentIds.map((id: string) => ({ id })) }
          : undefined,
      };

      if (ownerId && currentUser?.role === 'ADMIN') {
        updateData.ownerId = ownerId;
      }

      const project = await prisma.project.update({
        where: { id: projectId },
        data: updateData,
        include: {
          _count: { select: { tasks: true } },
          attachments: true,
          statuses: true,
          members: { select: { id: true, name: true, email: true } },
          tasks: {
            select: {
              id: true,
              deadline: true,
              status: { select: { name: true } },
              assignee: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      return res.status(200).json(project);
    } catch (error) {
      console.error("PATCH project error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (currentUser?.role !== 'ADMIN') {
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
