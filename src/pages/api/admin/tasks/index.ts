import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { projectId } = req.query;

    try {
      const tasks = await prisma.task.findMany({
        where: projectId ? { projectId: String(projectId) } : undefined,
        include: {
          status: true,
          assignee: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
          sprint: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, prefix: true } },
          epic: { select: { id: true, ticketId: true, title: true } }
        },
        orderBy: { createdAt: "desc" }
      });
      return res.status(200).json(tasks);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to fetch tasks", details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, description, storyPoints, startDate, deadline, statusId, projectId, sprintId, assigneeId, type, category, priority, blockedReason, parentId, epicId, ownerId } = req.body;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return res.status(404).json({ error: "Project not found" });

      const status = await prisma.taskStatus.findUnique({ where: { id: statusId } });
      if (!status) return res.status(404).json({ error: "Status not found" });

      // Resolve owner
      let resolvedOwnerId = ownerId;
      if (!resolvedOwnerId) {
        const fallbackUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) || await prisma.user.findFirst();
        if (!fallbackUser) {
          return res.status(400).json({ error: "No users exist. Please create a user first." });
        }
        resolvedOwnerId = fallbackUser.id;
      }

      const count = await prisma.task.count({ where: { projectId } });
      const ticketId = `${project.prefix}-${count + 1}`;

      const task = await prisma.task.create({
        data: {
          ticketId,
          title,
          description: description || "",
          type: type || "TASK",
          category,
          priority: priority || "MEDIUM",
          blockedReason: blockedReason || null,
          storyPoints: Number(storyPoints) || 0,
          startDate: startDate ? new Date(startDate) : null,
          deadline: deadline ? new Date(deadline) : null,
          statusId,
          projectId,
          sprintId: sprintId || null,
          assigneeId: assigneeId === "unassigned" ? null : assigneeId,
          parentId: parentId || null,
          epicId: epicId || null,
          ownerId: resolvedOwnerId,
        },
        include: {
          status: true,
          assignee: true,
        }
      });

      return res.status(200).json(task);
    } catch (error: any) {
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  }

  return res.status(405).end();
}
