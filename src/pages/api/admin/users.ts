import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const currentUser = await prisma.user.findUnique({ where: { id: session.userId } });
  if (currentUser?.role !== 'ADMIN') return res.status(403).json({ error: "Forbidden" });

  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" }
      });
      return res.status(200).json(users);
    } catch (error) {
      console.error("GET admin users error:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { userId, role } = req.body;
      if (!userId || !role) return res.status(400).json({ error: "userId and role are required" });

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role }
      });
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("PATCH admin user error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      await prisma.user.delete({ where: { id: String(userId) } });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DELETE admin user error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).end();
}
