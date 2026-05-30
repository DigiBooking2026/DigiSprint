import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === 'GET') {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return res.status(200).json(notifications);
    } catch (error) {
      console.error("GET notifications error:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }

  if (req.method === 'PATCH') {
    try {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId: session.userId, isRead: false },
        data: { isRead: true }
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("PATCH notifications error:", error);
      return res.status(500).json({ error: "Failed to update notifications" });
    }
  }

  return res.status(405).end();
}