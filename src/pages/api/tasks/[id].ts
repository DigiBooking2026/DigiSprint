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
      const { title, description, storyPoints, type, category, priority, blockedReason, statusId, assigneeId, loggedTime, attachmentIds, deadline } = req.body;

      const existingTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: { status: true, assignee: true, attachments: true }
      });

      if (!existingTask) return res.status(404).json({ error: "Task not found" });

      const targetStatus = statusId
        ? await prisma.taskStatus.findUnique({ where: { id: statusId } })
        : existingTask.status;
      if (targetStatus && /blocked/i.test(targetStatus.name)) {
        const reason = blockedReason !== undefined ? blockedReason : existingTask.blockedReason;
        if (!String(reason || "").trim()) {
          return res.status(400).json({ error: "Blocked reason is required when status is Blocked" });
        }
      }

      const updateData: Prisma.TaskUpdateInput = {};
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (storyPoints !== undefined) updateData.storyPoints = Number(storyPoints);
      if (type) updateData.type = type;
      if (category !== undefined) updateData.category = category;
      if (priority !== undefined) updateData.priority = priority || "MEDIUM";
      if (blockedReason !== undefined) updateData.blockedReason = blockedReason || null;
      if (statusId) updateData.status = { connect: { id: statusId } };
      if (assigneeId !== undefined) updateData.assignee = assigneeId ? { connect: { id: assigneeId } } : { disconnect: true };
      if (loggedTime !== undefined) updateData.loggedTime = Number(existingTask.loggedTime) + Number(loggedTime);
      if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
      if (attachmentIds !== undefined) {
        updateData.attachments = {
          set: attachmentIds.map((id: string) => ({ id }))
        };
      }

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

      const changedFields: string[] = [];
      if (title !== undefined && title !== existingTask.title) changedFields.push("title");
      if (description !== undefined && description !== existingTask.description) changedFields.push("description");
      if (storyPoints !== undefined && Number(storyPoints) !== existingTask.storyPoints) changedFields.push("story points");
      if (type !== undefined && type !== existingTask.type) changedFields.push("type");
      if (category !== undefined && category !== existingTask.category) changedFields.push("category");
      if (priority !== undefined && priority !== existingTask.priority) changedFields.push("priority");
      if (blockedReason !== undefined && blockedReason !== existingTask.blockedReason) changedFields.push("blocked reason");
      if (loggedTime !== undefined && Number(loggedTime) > 0) changedFields.push("logged time");
      if (deadline !== undefined) {
        const oldDeadline = existingTask.deadline ? existingTask.deadline.toISOString().split("T")[0] : "";
        const newDeadline = deadline ? new Date(deadline).toISOString().split("T")[0] : "";
        if (oldDeadline !== newDeadline) changedFields.push("deadline");
      }
      if (attachmentIds !== undefined) {
        const oldIds = existingTask.attachments.map(a => a.id).sort().join(",");
        const newIds = attachmentIds.map((id: string) => id).sort().join(",");
        if (oldIds !== newIds) changedFields.push("attachments");
      }

      if (changedFields.length > 0) {
        await prisma.taskHistory.create({
          data: {
            taskId: updatedTask.id,
            userId: session.userId,
            oldStatus: "Task edited",
            newStatus: `Updated ${changedFields.join(", ")}`,
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
        console.error("GET task error:", error);
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
