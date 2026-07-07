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
          attachments: true,
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
      const { content, attachmentIds } = req.body;
      if (!content && (!attachmentIds || attachmentIds.length === 0)) {
        return res.status(400).json({ error: "Content or attachments required" });
      }

      const comment = await prisma.comment.create({
        data: {
          content: content || "",
          taskId: String(taskId),
          userId: session.userId,
          attachments: {
            connect: (attachmentIds || []).map((id: string) => ({ id }))
          }
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          attachments: true,
        },
      });

      // Notify task assignee, owner, and mentioned users
      const task = await prisma.task.findUnique({ where: { id: String(taskId) } });
      if (task) {
        if (attachmentIds && attachmentIds.length > 0) {
          await prisma.task.update({
            where: { id: task.id },
            data: {
              attachments: {
                connect: attachmentIds.map((id: string) => ({ id }))
              }
            }
          });
        }
        
        const usersToNotify = new Set<string>();
        if (task.assigneeId && task.assigneeId !== session.userId) usersToNotify.add(task.assigneeId);
        if (task.ownerId && task.ownerId !== session.userId) usersToNotify.add(task.ownerId);

        // Detect tiptap mentions: <span data-type="mention" data-id="user-id">
        const mentionRegex = /data-type="mention"\s+data-id="([^"]+)"/g;
        const mentions = Array.from(String(content || "").matchAll(mentionRegex)).map(m => m[1]);

        if (mentions.length > 0) {
          const mentionedUsers = await prisma.user.findMany({
            where: { id: { in: mentions } },
            select: { id: true, name: true, email: true }
          });
          for (const u of mentionedUsers) {
            if (u.id !== session.userId) {
              usersToNotify.add(u.id);
            }
          }
        }

        for (const uid of usersToNotify) {
          await prisma.notification.create({
            data: {
              userId: uid,
              title: "New Comment",
              message: `${comment.user.name || comment.user.email} commented on ${task.ticketId}`,
              link: `/projects/${task.projectId}?task=${task.id}`
            }
          });
        }
      }

      return res.status(200).json(comment);
    } catch (error) {
      console.error("POST comment error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).end();
}
