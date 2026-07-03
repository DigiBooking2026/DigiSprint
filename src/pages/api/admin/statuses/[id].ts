import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const statusId = String(id);

  if (req.method === 'GET') {
    try {
      const status = await prisma.taskStatus.findUnique({
        where: { id: statusId }
      });
      if (!status) return res.status(404).json({ error: "Status not found" });
      return res.status(200).json(status);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to get status", details: error.message });
    }
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const { name, color, order } = req.body;
      const updateData: any = {};
      if (name) updateData.name = name;
      if (color) updateData.color = color;
      if (typeof order === 'number') updateData.order = order;

      const status = await prisma.taskStatus.update({
        where: { id: statusId },
        data: updateData
      });
      return res.status(200).json(status);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to update status", details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.taskStatus.delete({
        where: { id: statusId }
      });
      return res.status(200).json({ message: "Status deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to delete status", details: error.message });
    }
  }

  return res.status(405).end();
}
