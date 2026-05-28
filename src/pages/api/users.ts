import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        where: { role: "USER", isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" }
      });
      return res.status(200).json(users);
    } catch (error) {
      console.error("GET users error:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  return res.status(405).end();
}
