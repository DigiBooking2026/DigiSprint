const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient();

async function run() {
  console.log("Starting historical database dates and worklogs fix...");

  // 1. Fetch all projects, sprints, tasks, and users
  const projects = await prisma.project.findMany({
    include: {
      sprints: { orderBy: { name: "asc" } },
      tasks: true
    }
  });

  console.log(`Found ${projects.length} projects.`);

  // Define sequential start date: Jan 11, 2026
  let sprintStartDate = new Date("2026-01-11T09:00:00.000Z");

  for (const project of projects) {
    console.log(`Processing project "${project.name}" (ID: ${project.id})`);
    
    // Sort sprints numerically to map them to sequential dates
    const projectSprints = [...project.sprints].sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/) || "0", 10);
      const numB = parseInt(b.name.match(/\d+/) || "0", 10);
      return numA - numB;
    });

    console.log(`Sorted ${projectSprints.length} sprints.`);

    let currentSprintStart = new Date(sprintStartDate);

    for (let i = 0; i < projectSprints.length; i++) {
      const sprint = projectSprints[i];
      
      // Each sprint lasts 2 weeks (14 days)
      const startDate = new Date(currentSprintStart);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 14);

      // Determine sprint status:
      // Let's say Sprint 13 is ACTIVE, Sprint 12 and below are COMPLETED
      const isSprint13 = sprint.name.includes("13");
      const status = isSprint13 ? "ACTIVE" : "COMPLETED";

      console.log(`Sprint "${sprint.name}": status=${status}, start=${startDate.toISOString()}, end=${endDate.toISOString()}`);

      // Update Sprint dates and status
      await prisma.sprint.update({
        where: { id: sprint.id },
        data: {
          startDate,
          endDate,
          status,
          createdAt: startDate,
          updatedAt: endDate
        }
      });

      // Find tasks belonging to this sprint
      const sprintTasks = project.tasks.filter(t => t.sprintId === sprint.id);
      console.log(`  Found ${sprintTasks.length} tasks in this sprint.`);

      for (const task of sprintTasks) {
        // Calculate random timestamps within the sprint duration
        const taskCreatedTime = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const taskUpdatedTime = new Date(taskCreatedTime.getTime() + Math.random() * (endDate.getTime() - taskCreatedTime.getTime()));

        // Update task timestamps
        await prisma.task.update({
          where: { id: task.id },
          data: {
            createdAt: taskCreatedTime,
            updatedAt: taskUpdatedTime
          }
        });

        // If task has loggedTime > 0 and has an assignee, create a worklog entry in the database
        if (task.loggedTime > 0 && task.assigneeId) {
          // Clear any existing worklogs for this task first to prevent duplicates if seed is rerun
          await prisma.worklog.deleteMany({ where: { taskId: task.id } });

          // Create a worklog matching the task's loggedTime
          const worklogDate = new Date(taskCreatedTime.getTime() + Math.random() * (taskUpdatedTime.getTime() - taskCreatedTime.getTime()));
          
          await prisma.worklog.create({
            data: {
              taskId: task.id,
              userId: task.assigneeId,
              hours: task.loggedTime,
              notes: `Completed work logged for ${task.ticketId}`,
              date: worklogDate,
              createdAt: worklogDate
            }
          });
          console.log(`    Created ${task.loggedTime}h worklog for "${task.ticketId}" on ${worklogDate.toISOString()}`);
        }
      }

      // Move to next sprint start date (which starts when this one ends)
      currentSprintStart.setDate(currentSprintStart.getDate() + 14);
    }

    // Now update Backlog tasks (sprintId is null) to be historical too
    const backlogTasks = project.tasks.filter(t => !t.sprintId);
    console.log(`Processing ${backlogTasks.length} backlog tasks...`);
    for (const task of backlogTasks) {
      // Set to some dates in the last 30-60 days
      const daysAgo = 30 + Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      await prisma.task.update({
        where: { id: task.id },
        data: {
          createdAt: date,
          updatedAt: date
        }
      });
    }
  }

  console.log("Successfully completed historical database migration!");
  await prisma.$disconnect();
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
