import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  
  const { projectId } = req.query;

  if (req.method === 'GET') {
    try {
      const statuses = await prisma.taskStatus.findMany({
        where: projectId ? { projectId: String(projectId) } : undefined,
        orderBy: { order: "asc" }
      });
      return res.status(200).json(statuses);
    } catch (error) {
      console.error("GET statuses error:", error);
      return res.status(500).json({ error: "Failed to fetch statuses" });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, color, projectId: bodyProjectId } = req.body;
      const pid = projectId || bodyProjectId;
      if (!name || !pid) return res.status(400).json({ error: "Name and projectId are required" });

      const status = await prisma.taskStatus.create({
        data: { 
          name, 
          color, 
          projectId: String(pid)
        }
      });
      return res.status(200).json(status);
    } catch (error) {
      console.error("POST status error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).end();
}
