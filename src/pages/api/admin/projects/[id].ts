import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const projectId = String(id);

  if (req.method === 'GET') {
    try {
      const project = await prisma.project.findFirst({
        where: { id: projectId, deletedAt: null },
        include: {
          statuses: true,
          members: { select: { id: true, name: true, email: true } },
          tasks: {
            include: {
              status: true,
              assignee: { select: { id: true, name: true, email: true } },
            }
          }
        }
      });
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.status(200).json(project);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to get project", details: error.message });
    }
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const { name, description, prefix, startDate, deadline, ownerId, isPrivate } = req.body;
      
      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (prefix) updateData.prefix = prefix;
      if (startDate) updateData.startDate = new Date(startDate);
      if (deadline) updateData.deadline = new Date(deadline);
      if (ownerId) updateData.ownerId = ownerId;
      if (typeof isPrivate === 'boolean') updateData.isPrivate = isPrivate;

      const project = await prisma.project.update({
        where: { id: projectId },
        data: updateData,
        include: {
          statuses: true,
        }
      });
      return res.status(200).json(project);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to update project", details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Soft delete as in main app
      await prisma.project.update({
        where: { id: projectId },
        data: { deletedAt: new Date() }
      });
      return res.status(200).json({ message: "Project soft-deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to delete project", details: error.message });
    }
  }

  return res.status(405).end();
}
