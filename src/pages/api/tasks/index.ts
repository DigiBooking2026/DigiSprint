import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

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
          attachments: true,
          parent: { select: { id: true, ticketId: true, title: true } },
          subtasks: { select: { id: true, ticketId: true, title: true, status: true } },
          sourceLinks: { include: { target: { select: { id: true, ticketId: true, title: true, status: true } } } },
          targetLinks: { include: { source: { select: { id: true, ticketId: true, title: true, status: true } } } },
          project: { select: { id: true, name: true, prefix: true } },
          tags: true
        },
        orderBy: { createdAt: "desc" }
      });
      return res.status(200).json(tasks);
    } catch (error) {
      console.error("GET tasks error:", error);
      return res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, description, storyPoints, deadline, statusId, projectId, sprintId, assigneeId, attachmentIds, type, category, priority, blockedReason, parentId, tagIds } = req.body;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return res.status(404).json({ error: "Project not found" });

      const status = await prisma.taskStatus.findUnique({ where: { id: statusId } });
      if (!status) return res.status(404).json({ error: "Status not found" });
      if (/blocked/i.test(status.name) && !String(blockedReason || "").trim()) {
        return res.status(400).json({ error: "Blocked reason is required when status is Blocked" });
      }

      const count = await prisma.task.count({ where: { projectId } });
      const ticketId = `${project.prefix}-${count + 1}`;

      const task = await prisma.task.create({
        data: {
          ticketId,
          title,
          description,
          type: type || "TASK",
          category,
          priority: priority || "MEDIUM",
          blockedReason: blockedReason || null,
          storyPoints: Number(storyPoints) || 0,
          deadline: deadline ? new Date(deadline) : null,
          statusId,
          projectId,
          sprintId: sprintId || null,
          assigneeId: assigneeId === "unassigned" ? null : assigneeId,
          parentId: parentId || null,
          ownerId: session.userId,
          attachments: {
            connect: (attachmentIds || []).map((id: string) => ({ id }))
          },
          tags: {
            connect: (tagIds || []).map((id: string) => ({ id }))
          }
        },
        include: {
          status: true,
          assignee: true,
          attachments: true,
          tags: true
        }
      });

      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          userId: session.userId,
          newStatus: task.status.name,
        }
      });

      return res.status(200).json(task);
    } catch (error) {
      console.error("POST task error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).end();
}
