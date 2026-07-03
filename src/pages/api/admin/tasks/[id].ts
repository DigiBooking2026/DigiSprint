import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const taskId = String(id);

  if (req.method === 'GET') {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          status: true,
          assignee: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
          sprint: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, prefix: true } },
          epic: { select: { id: true, ticketId: true, title: true } }
        }
      });
      if (!task) return res.status(404).json({ error: "Task not found" });
      return res.status(200).json(task);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to get task", details: error.message });
    }
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const { title, description, storyPoints, type, category, priority, blockedReason, statusId, assigneeId, ownerId, sprintId, epicId, startDate, deadline, parentId } = req.body;

      const updateData: any = {};
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (storyPoints !== undefined) updateData.storyPoints = Number(storyPoints);
      if (type) updateData.type = type;
      if (category !== undefined) updateData.category = category;
      if (priority) updateData.priority = priority;
      if (blockedReason !== undefined) updateData.blockedReason = blockedReason;
      if (statusId) updateData.status = { connect: { id: statusId } };
      if (assigneeId !== undefined) {
        updateData.assignee = assigneeId ? { connect: { id: assigneeId } } : { disconnect: true };
      }
      if (ownerId) updateData.owner = { connect: { id: ownerId } };
      if (sprintId !== undefined) {
        updateData.sprint = sprintId ? { connect: { id: sprintId } } : { disconnect: true };
      }
      if (epicId !== undefined) {
        updateData.epic = epicId ? { connect: { id: epicId } } : { disconnect: true };
      }
      if (parentId !== undefined) {
        updateData.parent = parentId ? { connect: { id: parentId } } : { disconnect: true };
      }
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
      if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          status: true,
          assignee: true,
          owner: true
        }
      });
      return res.status(200).json(updatedTask);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to update task", details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.task.delete({
        where: { id: taskId }
      });
      return res.status(200).json({ message: "Task deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to delete task", details: error.message });
    }
  }

  return res.status(405).end();
}
