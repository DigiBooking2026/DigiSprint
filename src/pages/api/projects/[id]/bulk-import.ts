import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { id: projectId } = req.query;
  const apiKey = req.headers['authorization']?.split(' ')[1] || req.headers['x-api-key'];
  
  let user = null;

  // 1. Authentication
  // Allow API key from ENV OR regular session
  if (apiKey && process.env.IMPORT_API_KEY && apiKey === process.env.IMPORT_API_KEY) {
    // Verified via API Key. We need an "owner" for actions.
    // Fetch the first admin or project owner.
    const project = await prisma.project.findUnique({ where: { id: String(projectId) }, include: { owner: true } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    user = project.owner;
    if (!user) {
      user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    }
  } else {
    // Verify via Session
    const session = await getSessionFromRequest(req);
    if (!session) return res.status(401).json({ error: "Unauthorized. Missing valid session or API key." });
    user = await prisma.user.findUnique({ where: { id: session.userId } });
  }

  if (!user) return res.status(401).json({ error: "Unauthorized. Could not determine operating user." });

  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  try {
    const project = await prisma.project.findUnique({ 
      where: { id: String(projectId) },
      include: { statuses: { orderBy: { order: 'asc' } } }
    });
    
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (project.statuses.length === 0) return res.status(400).json({ error: "Project has no statuses" });

    // Fetch users for mapping
    const allUsers = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
    
    // Fetch current task count for ticket ID generation
    let currentTaskCount = await prisma.task.count({ where: { projectId: project.id } });
    
    const results = {
      sprintsCreated: 0,
      tasksCreated: 0,
      epicsCreated: 0,
    };

    const getAssigneeId = (email?: string, name?: string) => {
      if (!email && !name) return undefined;
      const found = allUsers.find(u => 
        (email && u.email.toLowerCase() === email.toLowerCase()) || 
        (name && u.name?.toLowerCase() === name.toLowerCase())
      );
      return found?.id;
    };

    const getStatusId = (statusName?: string) => {
      if (!statusName) return project.statuses[0].id;
      const found = project.statuses.find(s => s.name.toLowerCase() === statusName.toLowerCase());
      return found ? found.id : project.statuses[0].id;
    };

    // Helper to create a single task
    const createTask = async (taskData: any, sprintId?: string, epicId?: string) => {
      currentTaskCount++;
      const ticketId = `${project.prefix}-${currentTaskCount}`;
      
      const statusId = getStatusId(taskData.status);
      const assigneeId = getAssigneeId(taskData.assigneeEmail, taskData.assigneeName);
      
      return await prisma.task.create({
        data: {
          ticketId,
          title: taskData.title,
          description: taskData.description || "",
          type: taskData.type || "TASK",
          priority: taskData.priority || "MEDIUM",
          storyPoints: taskData.storyPoints || 0,
          category: taskData.category || undefined,
          statusId,
          projectId: project.id,
          sprintId,
          epicId,
          ownerId: user.id,
          assigneeId,
          startDate: taskData.startDate ? new Date(taskData.startDate) : undefined,
          deadline: taskData.deadline ? new Date(taskData.deadline) : undefined,
        }
      });
    };

    const epicIdMap = new Map<string, string>(); // epic title -> epic id

    // 2. Create Epics
    if (Array.isArray(payload.epics)) {
      for (const epicData of payload.epics) {
        if (!epicData.title) continue;
        const epic = await createTask({ ...epicData, type: 'EPIC' });
        epicIdMap.set(epicData.title.toLowerCase(), epic.id);
        results.epicsCreated++;
      }
    }

    const resolveEpicId = (epicTitle?: string) => {
      if (!epicTitle) return undefined;
      return epicIdMap.get(epicTitle.toLowerCase());
    };

    // 3. Create Sprints and their Tasks
    if (Array.isArray(payload.sprints)) {
      for (const sprintData of payload.sprints) {
        if (!sprintData.name) continue;
        
        const sprint = await prisma.sprint.create({
          data: {
            name: sprintData.name,
            goal: sprintData.goal || null,
            startDate: sprintData.startDate ? new Date(sprintData.startDate) : null,
            endDate: sprintData.endDate ? new Date(sprintData.endDate) : null,
            status: sprintData.status || "PLANNED",
            projectId: project.id,
          }
        });
        results.sprintsCreated++;

        if (Array.isArray(sprintData.tasks)) {
          for (const taskData of sprintData.tasks) {
            if (!taskData.title) continue;
            await createTask(taskData, sprint.id, resolveEpicId(taskData.epicTitle));
            results.tasksCreated++;
          }
        }
      }
    }

    // 4. Create Standalone Tasks (Backlog)
    if (Array.isArray(payload.tasks)) {
      for (const taskData of payload.tasks) {
        if (!taskData.title) continue;
        await createTask(taskData, undefined, resolveEpicId(taskData.epicTitle));
        results.tasksCreated++;
      }
    }

    return res.status(200).json({ success: true, message: "Bulk import successful", results });

  } catch (error) {
    console.error("Bulk import error:", error);
    return res.status(500).json({ error: "Failed to process bulk import", details: (error as Error).message });
  }
}
