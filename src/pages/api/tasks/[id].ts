import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { Prisma } from '@/generated/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  const taskId = String(id);

  if (req.method === 'PATCH') {
    try {
      const { title, description, storyPoints, type, category, statusId, assigneeId, loggedTime } = req.body;

      const existingTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: { status: true, assignee: true }
      });

      if (!existingTask) return res.status(404).json({ error: "Task not found" });

      const updateData: Prisma.TaskUpdateInput = {};
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (storyPoints !== undefined) updateData.storyPoints = Number(storyPoints);
      if (type) updateData.type = type;
      if (category !== undefined) updateData.category = category;
      if (statusId) updateData.status = { connect: { id: statusId } };
      if (assigneeId !== undefined) updateData.assignee = assigneeId ? { connect: { id: assigneeId } } : { disconnect: true };
      if (loggedTime !== undefined) updateData.loggedTime = Number(existingTask.loggedTime) + Number(loggedTime);

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          status: true,
          assignee: { select: { id: true, name: true, email: true } },
          attachments: true,
          history: {
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      // Log status change
      if (statusId && existingTask.statusId !== statusId) {
        await prisma.taskHistory.create({
          data: {
            taskId: updatedTask.id,
            userId: session.userId,
            oldStatus: existingTask.status.name,
            newStatus: updatedTask.status.name,
          }
        });
      }
      
      // Log assignee change
      if (assigneeId !== undefined && existingTask.assigneeId !== (assigneeId || null)) {
          const newAssignee = assigneeId ? await prisma.user.findUnique({ where: { id: assigneeId } }) : null;
          await prisma.taskHistory.create({
              data: {
                  taskId: updatedTask.id,
                  userId: session.userId,
                  oldStatus: existingTask.assignee?.name || existingTask.assignee?.email || "Unassigned",
                  newStatus: newAssignee?.name || newAssignee?.email || "Unassigned",
              }
          });
      }

      return res.status(200).json(updatedTask);
    } catch (error) {
      console.error("PATCH task error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method === 'GET') {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          status: true,
          assignee: { select: { id: true, name: true, email: true } },
          attachments: true,
          comments: {
              include: { user: { select: { id: true, name: true, email: true } }, attachments: true },
              orderBy: { createdAt: 'asc' }
          },
          history: {
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      if (!task) return res.status(404).json({ error: "Task not found" });
      return res.status(200).json(task);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.task.delete({
        where: { id: taskId }
      });
      return res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("DELETE task error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).end();
}
