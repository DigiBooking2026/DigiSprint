import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const tagId = String(id);

  if (req.method === 'GET') {
    try {
      const tag = await prisma.tag.findUnique({
        where: { id: tagId }
      });
      if (!tag) return res.status(404).json({ error: "Tag not found" });
      return res.status(200).json(tag);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to get tag", details: error.message });
    }
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const { name, color } = req.body;
      const updateData: any = {};
      if (name) updateData.name = name;
      if (color !== undefined) updateData.color = color || null;

      const tag = await prisma.tag.update({
        where: { id: tagId },
        data: updateData
      });
      return res.status(200).json(tag);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to update tag", details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.tag.delete({
        where: { id: tagId }
      });
      return res.status(200).json({ message: "Tag deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to delete tag", details: error.message });
    }
  }

  return res.status(405).end();
}
