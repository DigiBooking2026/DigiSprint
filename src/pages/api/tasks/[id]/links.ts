import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  const taskId = String(id);

  if (req.method === 'POST') {
    try {
      const { targetId, type } = req.body;
      if (!targetId || !type) {
        return res.status(400).json({ error: "targetId and type are required" });
      }

      if (taskId === targetId) {
        return res.status(400).json({ error: "Cannot link a task to itself" });
      }

      // Check if both tasks exist
      const sourceTask = await prisma.task.findUnique({ where: { id: taskId } });
      const targetTask = await prisma.task.findUnique({ where: { id: targetId } });

      if (!sourceTask || !targetTask) {
        return res.status(404).json({ error: "One or both tasks not found" });
      }

      const link = await prisma.taskLink.create({
        data: {
          sourceId: taskId,
          targetId,
          type,
        },
      });

      return res.status(200).json(link);
    } catch (error) {
      console.error("POST task link error:", error);
      return res.status(500).json({ error: "Failed to create task link" });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { targetId, type } = req.body;
      if (!targetId || !type) {
        return res.status(400).json({ error: "targetId and type are required" });
      }

      await prisma.taskLink.delete({
        where: {
          sourceId_targetId_type: {
            sourceId: taskId,
            targetId: String(targetId),
            type: String(type),
          }
        }
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DELETE task link error:", error);
      return res.status(500).json({ error: "Failed to delete task link" });
    }
  }

  return res.status(405).end();
}