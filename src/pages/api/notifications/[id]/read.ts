import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;

  if (req.method === 'PATCH') {
    try {
      await prisma.notification.update({
        where: { id: String(id), userId: session.userId },
        data: { isRead: true }
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("PATCH notification read error:", error);
      return res.status(500).json({ error: "Failed to update notification" });
    }
  }

  return res.status(405).end();
}