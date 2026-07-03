import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const tags = await prisma.tag.findMany({
        orderBy: { name: 'asc' }
      });
      return res.status(200).json(tags);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to fetch tags", details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, color } = req.body;
      if (!name) return res.status(400).json({ error: "Tag name is required" });

      const tag = await prisma.tag.upsert({
        where: { name },
        update: { color: color || null },
        create: { name, color: color || null }
      });
      return res.status(200).json(tag);
    } catch (error: any) {
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  }

  return res.status(405).end();
}
