import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === 'GET') {
    try {
      const tags = await prisma.tag.findMany({
        orderBy: { name: 'asc' }
      });
      return res.status(200).json(tags);
    } catch (error) {
      console.error("GET tags error:", error);
      return res.status(500).json({ error: "Failed to fetch tags" });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, color } = req.body;
      if (!name) return res.status(400).json({ error: "Tag name is required" });

      // Upsert to handle if someone creates a tag with same name
      const tag = await prisma.tag.upsert({
        where: { name },
        update: { color: color || null },
        create: { name, color: color || null }
      });
      
      return res.status(200).json(tag);
    } catch (error) {
      console.error("POST tag error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).end();
}
