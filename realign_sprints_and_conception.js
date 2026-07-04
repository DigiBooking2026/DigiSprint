const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient();

async function run() {
  console.log("Realigning database timelines and creating conception tasks...");

  const projects = await prisma.project.findMany({
    include: {
      sprints: true,
      tasks: true,
      owner: true
    }
  });

  const statuses = await prisma.taskStatus.findMany();
  console.log(`Found ${projects.length} projects and ${statuses.length} status configurations.`);

  // Project managers list to assign PM tasks
  const pms = await prisma.user.findMany({
    where: { role: "PM", isActive: true }
  });

  for (const project of projects) {
    console.log(`\n--------------------------------------------`);
    console.log(`Project: "${project.name}" (ID: ${project.id})`);
    
    // 1. Sort sprints by numerical order
    const projectSprints = [...project.sprints].sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/) || "0", 10);
      const numB = parseInt(b.name.match(/\d+/) || "0", 10);
      return numA - numB;
    });

    console.log(`Found ${projectSprints.length} sprints.`);

    // Sprint 1 start date: June 21, 2026 (Sunday)
    let currentSprintStart = new Date("2026-06-21T09:00:00.000Z");

    for (let i = 0; i < projectSprints.length; i++) {
      const sprint = projectSprints[i];
      const num = parseInt(sprint.name.match(/\d+/) || "0", 10);

      // Sprints are 1 week long (starts Sunday, ends Saturday)
      const startDate = new Date(currentSprintStart);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(18, 0, 0, 0); // Saturday evening

      // Determine sprint status:
      // Sprint 1: COMPLETED (since today is July 4)
      // Sprint 2: ACTIVE (June 28 to July 4 - today is July 4!)
      // Sprint 3 and above: PLANNED (future sprints)
      let status = "PLANNED";
      if (num === 1) {
        status = "COMPLETED";
      } else if (num === 2) {
        status = "ACTIVE";
      }

      console.log(`  Updating "${sprint.name}": status=${status}, start=${startDate.toISOString().split("T")[0]}, end=${endDate.toISOString().split("T")[0]}`);

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

      // Distribute tasks belonging to this sprint
      const sprintTasks = project.tasks.filter(t => t.sprintId === sprint.id);
      for (const task of sprintTasks) {
        const taskCreatedTime = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const taskUpdatedTime = new Date(taskCreatedTime.getTime() + Math.random() * (endDate.getTime() - taskCreatedTime.getTime()));

        await prisma.task.update({
          where: { id: task.id },
          data: {
            createdAt: taskCreatedTime,
            updatedAt: taskUpdatedTime
          }
        });

        // Recreate worklog if task has loggedTime > 0
        if (task.loggedTime > 0 && task.assigneeId) {
          await prisma.worklog.deleteMany({ where: { taskId: task.id } });
          
          const worklogDate = new Date(taskCreatedTime.getTime() + Math.random() * (taskUpdatedTime.getTime() - taskCreatedTime.getTime()));
          await prisma.worklog.create({
            data: {
              taskId: task.id,
              userId: task.assigneeId,
              hours: task.loggedTime,
              notes: `Worked on ${task.ticketId}`,
              date: worklogDate,
              createdAt: worklogDate
            }
          });
        }
      }

      // Move to next Sunday
      currentSprintStart.setDate(currentSprintStart.getDate() + 7);
    }

    // 2. Adjust Backlog tasks to fall within the June 1 - Sept 30 range
    const backlogTasks = project.tasks.filter(t => !t.sprintId);
    console.log(`  Adjusting ${backlogTasks.length} backlog tasks...`);
    for (const task of backlogTasks) {
      // Set creation date randomly between June 1st and September 30th
      const startRange = new Date("2026-06-01T09:00:00.000Z").getTime();
      const endRange = new Date("2026-09-30T18:00:00.000Z").getTime();
      const date = new Date(startRange + Math.random() * (endRange - startRange));

      await prisma.task.update({
        where: { id: task.id },
        data: {
          createdAt: date,
          updatedAt: date
        }
      });
    }

    // 3. Create Architecture and Data Conception Tasks (June 1 to June 20)
    console.log("  Creating Architecture and Conception tasks...");
    
    // Find Done status ID
    const doneStatus = statuses.find(s => s.name === "Done" && s.projectId === project.id) || 
                       statuses.find(s => s.name === "Done") ||
                       statuses[0];

    const projectPM = project.ownerId || (pms.length > 0 ? pms[0].id : null);
    if (!projectPM) {
      console.log("    Skipping conception tasks creation: No PM or owner found for this project.");
      continue;
    }

    const conceptionTasks = [
      {
        ticketId: `${project.prefix}-CONC-1`,
        title: "Define system architecture and technology stack",
        description: "<p>Establish technology stack, infrastructure patterns, and deployment strategies.</p>",
        category: "Architecture",
        storyPoints: 8,
        loggedTime: 8,
        createdAt: new Date("2026-06-03T10:00:00.000Z"),
        updatedAt: new Date("2026-06-05T16:00:00.000Z")
      },
      {
        ticketId: `${project.prefix}-CONC-2`,
        title: "Database schema design and normalization",
        description: "<p>Design primary relational tables, foreign key constraints, indexes, and normalization schemas.</p>",
        category: "Database",
        storyPoints: 13,
        loggedTime: 13,
        createdAt: new Date("2026-06-08T10:00:00.000Z"),
        updatedAt: new Date("2026-06-11T16:00:00.000Z")
      },
      {
        ticketId: `${project.prefix}-CONC-3`,
        title: "Draft API specification and contract schemas",
        description: "<p>Draft all REST API endpoints, request payloads, response schemas, and error responses.</p>",
        category: "Backend",
        storyPoints: 8,
        loggedTime: 8,
        createdAt: new Date("2026-06-12T10:00:00.000Z"),
        updatedAt: new Date("2026-06-15T16:00:00.000Z")
      },
      {
        ticketId: `${project.prefix}-CONC-4`,
        title: "Create UI/UX wireframes and user flow diagrams",
        description: "<p>Create wireframes for core dashboards, user registration pages, and settings screens.</p>",
        category: "UI",
        storyPoints: 13,
        loggedTime: 13,
        createdAt: new Date("2026-06-16T10:00:00.000Z"),
        updatedAt: new Date("2026-06-19T16:00:00.000Z")
      }
    ];

    for (const ct of conceptionTasks) {
      // Check if task already exists
      const existing = await prisma.task.findUnique({
        where: { ticketId: ct.ticketId }
      });

      let taskId = "";
      if (existing) {
        taskId = existing.id;
        console.log(`    Task ${ct.ticketId} already exists. Re-stamping...`);
        await prisma.task.update({
          where: { id: taskId },
          data: {
            createdAt: ct.createdAt,
            updatedAt: ct.updatedAt,
            statusId: doneStatus.id,
            assigneeId: projectPM,
            loggedTime: ct.loggedTime,
            storyPoints: ct.storyPoints
          }
        });
      } else {
        console.log(`    Creating task ${ct.ticketId}...`);
        const created = await prisma.task.create({
          data: {
            ticketId: ct.ticketId,
            title: ct.title,
            description: ct.description,
            type: "TASK",
            category: ct.category,
            storyPoints: ct.storyPoints,
            loggedTime: ct.loggedTime,
            statusId: doneStatus.id,
            projectId: project.id,
            ownerId: projectPM,
            assigneeId: projectPM,
            createdAt: ct.createdAt,
            updatedAt: ct.updatedAt
          }
        });
        taskId = created.id;
      }

      // Create worklogs for the conception tasks
      await prisma.worklog.deleteMany({ where: { taskId } });
      
      const worklogDate = new Date(ct.createdAt.getTime() + (ct.updatedAt.getTime() - ct.createdAt.getTime()) / 2);
      await prisma.worklog.create({
        data: {
          taskId,
          userId: projectPM,
          hours: ct.loggedTime,
          notes: `Completed architecture/conception work for ${ct.ticketId}`,
          date: worklogDate,
          createdAt: worklogDate
        }
      });
      console.log(`      Created worklog of ${ct.loggedTime}h on ${worklogDate.toISOString().split("T")[0]}`);
    }
  }

  console.log("\nRe-alignment and Conception task creation completed successfully!");
  await prisma.$disconnect();
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
