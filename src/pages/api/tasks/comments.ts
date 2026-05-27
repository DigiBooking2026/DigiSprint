import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { taskId } = req.query;

  if (req.method === 'GET') {
    try {
      const comments = await prisma.comment.findMany({
        where: { taskId: String(taskId) },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      return res.status(200).json(comments);
    } catch (error) {
      console.error("GET comments error:", error);
      return res.status(500).json({ error: "Failed to fetch comments" });
    }
  }

  if (req.method === 'POST') {
    try {
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: "Content is required" });

      const comment = await prisma.comment.create({
        data: {
          content,
          taskId: String(taskId),
          userId: session.userId,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return res.status(200).json(comment);
    } catch (error) {
      console.error("POST comment error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).end();
}
