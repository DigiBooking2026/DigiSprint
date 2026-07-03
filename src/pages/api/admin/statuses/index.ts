import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  if (req.method === 'GET') {
    try {
      const statuses = await prisma.taskStatus.findMany({
        where: projectId ? { projectId: String(projectId) } : undefined,
        orderBy: { order: "asc" }
      });
      return res.status(200).json(statuses);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to fetch statuses", details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, color, projectId: bodyProjectId, order } = req.body;
      const pid = projectId || bodyProjectId;
      if (!name || !pid) return res.status(400).json({ error: "Name and projectId are required" });

      const count = await prisma.taskStatus.count({ where: { projectId: String(pid) } });

      const status = await prisma.taskStatus.create({
        data: { 
          name, 
          color: color || "#64748b", 
          projectId: String(pid),
          order: typeof order === 'number' ? order : count + 1
        }
      });
      return res.status(200).json(status);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to create status", details: error.message });
    }
  }

  return res.status(405).end();
}
