import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

function startOfDay(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: string) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function isDoneStatus(name?: string) {
  return /done|closed|complete|cancelled/i.test(name || "");
}

function isNotStartedStatus(name?: string) {
  return /backlog|to do|todo|not started|open/i.test(name || "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 6);

    const from = typeof req.query.from === "string" ? startOfDay(req.query.from) : startOfDay(defaultFrom.toISOString());
    const to = typeof req.query.to === "string" ? endOfDay(req.query.to) : endOfDay(now.toISOString());

    const [users, statuses, tasks] = await Promise.all([
      prisma.user.findMany({
        where: { role: "USER" },
        select: { id: true, name: true, email: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      }),
      prisma.taskStatus.findMany({
        select: { id: true, name: true, color: true },
        orderBy: { order: "asc" },
      }),
      prisma.task.findMany({
        where: {
          project: { deletedAt: null },
          OR: [
            { updatedAt: { gte: from, lte: to } },
            { createdAt: { gte: from, lte: to } },
            { deadline: { gte: from, lte: to } },
            { deadline: { lt: now } },
          ],
        },
        include: {
          status: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true, prefix: true, deadline: true } },
        },
      }),
    ]);

    const periodTasks = tasks.filter(task => task.updatedAt >= from && task.updatedAt <= to);
    const currentOpenTasks = tasks.filter(task => !isDoneStatus(task.status.name));
    const statusNames = Array.from(new Set(statuses.map(status => status.name)));

    const developerStats = users.map(user => {
      const assignedPeriodTasks = periodTasks.filter(task => task.assigneeId === user.id);
      const assignedCurrentTasks = tasks.filter(task => task.assigneeId === user.id);
      const openTasks = assignedCurrentTasks.filter(task => !isDoneStatus(task.status.name));
      const doneTasks = assignedPeriodTasks.filter(task => isDoneStatus(task.status.name));
      const notStartedTasks = openTasks.filter(task => isNotStartedStatus(task.status.name));
      const inProgressTasks = Math.max(openTasks.length - notStartedTasks.length, 0);
      const overdueTasks = openTasks.filter(task => task.deadline && task.deadline < now);
      const bugTasks = assignedCurrentTasks.filter(task => task.type === "BUG");
      const openBugTasks = bugTasks.filter(task => !isDoneStatus(task.status.name));
      const loggedTime = assignedPeriodTasks.reduce((sum, task) => sum + Number(task.loggedTime || 0), 0);
      const estimatedTime = assignedPeriodTasks.reduce((sum, task) => sum + Number(task.storyPoints || 0), 0);
      const doneEstimate = doneTasks.reduce((sum, task) => sum + Number(task.storyPoints || 0), 0);
      const activeEstimate = openTasks.reduce((sum, task) => sum + Number(task.storyPoints || 0), 0);
      const completionRate = assignedPeriodTasks.length ? Math.round((doneTasks.length / assignedPeriodTasks.length) * 100) : 0;
      const overdueRate = openTasks.length ? Math.round((overdueTasks.length / openTasks.length) * 100) : 0;
      const statusCounts = statusNames.reduce<Record<string, number>>((counts, statusName) => {
        counts[statusName] = assignedCurrentTasks.filter(task => task.status.name === statusName).length;
        return counts;
      }, {});
      const score = Math.max(0, Math.round(
        completionRate +
        doneEstimate * 3 +
        loggedTime -
        overdueTasks.length * 12 -
        openBugTasks.length * 6
      ));

      return {
        user,
        assignedTasks: assignedCurrentTasks.length,
        updatedInPeriod: assignedPeriodTasks.length,
        doneTasks: doneTasks.length,
        openTasks: openTasks.length,
        notStartedTasks: notStartedTasks.length,
        inProgressTasks,
        overdueTasks: overdueTasks.length,
        bugTasks: bugTasks.length,
        openBugTasks: openBugTasks.length,
        loggedTime,
        estimatedTime,
        doneEstimate,
        activeEstimate,
        completionRate,
        overdueRate,
        statusCounts,
        score,
      };
    }).sort((a, b) => b.score - a.score || b.doneEstimate - a.doneEstimate);

    const totalStatusCounts = statusNames.reduce<Record<string, number>>((counts, statusName) => {
      counts[statusName] = tasks.filter(task => task.status.name === statusName).length;
      return counts;
    }, {});

    const totals = {
      tasks: tasks.length,
      updatedInPeriod: periodTasks.length,
      openTasks: currentOpenTasks.length,
      doneTasks: periodTasks.filter(task => isDoneStatus(task.status.name)).length,
      bugs: tasks.filter(task => task.type === "BUG").length,
      openBugs: tasks.filter(task => task.type === "BUG" && !isDoneStatus(task.status.name)).length,
      overdueTasks: currentOpenTasks.filter(task => task.deadline && task.deadline < now).length,
      loggedTime: periodTasks.reduce((sum, task) => sum + Number(task.loggedTime || 0), 0),
      estimatedTime: periodTasks.reduce((sum, task) => sum + Number(task.storyPoints || 0), 0),
      statusCounts: totalStatusCounts,
    };

    return res.status(200).json({
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
      statuses: statuses.map(status => ({ name: status.name, color: status.color })),
      totals,
      developers: developerStats,
    });
  } catch (error) {
    console.error("GET stats error:", error);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
}
