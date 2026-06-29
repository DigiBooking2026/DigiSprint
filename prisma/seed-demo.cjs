/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    const value = trimmed.slice(equalsAt + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

const demoPrefixes = ["DB", "ZT", "YN", "ZSN", "ZC"];

const defaultStatuses = [
  { name: "Backlog", color: "#64748b", order: 1 },
  { name: "To Do", color: "#3b82f6", order: 2 },
  { name: "In Progress", color: "#f59e0b", order: 3 },
  { name: "Review", color: "#8b5cf6", order: 4 },
  { name: "Testing", color: "#ec4899", order: 5 },
  { name: "QA", color: "#10b981", order: 6 },
  { name: "Done", color: "#22c55e", order: 7 },
  { name: "Blocked", color: "#ef4444", order: 8 },
  { name: "Cancelled", color: "#94a3b8", order: 9 },
];

function dateFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date;
}

async function ensureUsers() {
  const hashedPassword = await bcrypt.hash("demo1234", 10);
  const users = [
    { email: "admin.demo@digibooking.local", name: "محمد بن علي", role: "ADMIN" },
    { email: "frontend.demo@digibooking.local", name: "أحمد الهاشمي", role: "USER" },
    { email: "backend.demo@digibooking.local", name: "ليلى منصور", role: "USER" },
    { email: "qa.demo@digibooking.local", name: "سارة بن يوسف", role: "USER" },
  ];

  const created = [];
  for (const user of users) {
    created.push(await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, isActive: true },
      create: { ...user, password: hashedPassword, isActive: true },
    }));
  }
  return created;
}

const templates = [
  {
    name: "DigiBooking",
    prefix: "DB",
    description: "<p>A comprehensive platform for booking appointments and managing schedules.</p>",
    startDate: dateFromToday(-12),
    deadline: dateFromToday(18),
    tasks: [
      { title: "Create landing page wireframe", status: "Done", points: 4, due: -5, assignee: 1 },
      { title: "Build responsive pricing section", status: "In Progress", points: 6, due: 2, assignee: 1, priority: "HIGH" },
      { title: "Review header navigation", status: "Blocked", points: 2, due: 1, assignee: 0, priority: "HIGH", blockedReason: "Waiting for final brand navigation copy from the product owner." },
      { title: "Prepare accessibility pass", status: "To Do", points: 3, due: 9, assignee: 3 },
    ],
  },
  {
    name: "ZTrip",
    prefix: "ZT",
    description: "<p>A ride-sharing and travel itinerary management system.</p>",
    startDate: dateFromToday(-25),
    deadline: dateFromToday(-2),
    tasks: [
      { title: "Fix driver location sync retry bug", status: "In Progress", points: 8, due: -4, assignee: 2, type: "BUG", category: "Backend", priority: "CRITICAL" },
      { title: "Add trip history audit coverage", status: "Testing", points: 5, due: -1, assignee: 3, category: "Testing", priority: "HIGH" },
      { title: "Document GPS tracking payload contract", status: "Done", points: 2, due: -8, assignee: 2, category: "Documentation" },
      { title: "Harden driver photo upload validation", status: "Backlog", points: 4, due: 6, assignee: 2, category: "Backend" },
    ],
  },
  {
    name: "YallaNamrah",
    prefix: "YN",
    description: "<p>An e-commerce platform for localized goods and services.</p>",
    startDate: dateFromToday(3),
    deadline: dateFromToday(28),
    tasks: [
      { title: "Set up mobile shopping cart shell", status: "Backlog", points: 5, due: 8, assignee: 1, category: "Frontend" },
      { title: "Define push notification settings UI", status: "To Do", points: 3, due: 12, assignee: 1, category: "UI" },
      { title: "Plan offline catalog cache", status: "To Do", points: 6, due: 16, assignee: 2, category: "Database" },
    ],
  },
  {
    name: "ZSocial(Nexus)",
    prefix: "ZSN",
    description: "<p>A next-generation social networking application connecting professionals.</p>",
    startDate: dateFromToday(-20),
    deadline: dateFromToday(-3),
    tasks: [
      { title: "Run feed algorithm regression suite", status: "Done", points: 4, due: -10, assignee: 3, category: "Testing" },
      { title: "Verify connection request error states", status: "Done", points: 3, due: -8, assignee: 3, type: "BUG", category: "Testing", priority: "HIGH" },
      { title: "Approve v2.0 release checklist", status: "Done", points: 2, due: -6, assignee: 0, category: "Documentation" },
      { title: "Smoke test chat production build", status: "Done", points: 2, due: -4, assignee: 3, category: "DevOps" },
    ],
  },
  {
    name: "ZCars",
    prefix: "ZC",
    description: "<p>A car rental and marketplace application.</p>",
    startDate: dateFromToday(-5),
    deadline: dateFromToday(45),
    tasks: [
      { title: "Design car listing details page", status: "In Progress", points: 8, due: 5, assignee: 1, category: "Frontend", priority: "HIGH" },
      { title: "Implement Stripe payment gateway", status: "To Do", points: 13, due: 15, assignee: 2, category: "Backend", priority: "CRITICAL" },
      { title: "Create rental agreement PDF generator", status: "Backlog", points: 5, due: 20, assignee: 2, category: "Backend" },
      { title: "Test vehicle search filters", status: "Backlog", points: 3, due: 25, assignee: 3, category: "Testing" },
    ],
  }
];

async function main() {
  const users = await ensureUsers();
  const fallbackAssignee = users.find(user => user.role === "USER") || users[0];

  const existingDemoProjects = await prisma.project.findMany({
    where: { prefix: { in: demoPrefixes } },
    select: { id: true },
  });
  const existingDemoProjectIds = existingDemoProjects.map(project => project.id);

  if (existingDemoProjectIds.length > 0) {
    await prisma.taskHistory.deleteMany({
      where: { task: { projectId: { in: existingDemoProjectIds } } },
    });
    await prisma.attachment.deleteMany({
      where: {
        OR: [
          { projectId: { in: existingDemoProjectIds } },
          { task: { projectId: { in: existingDemoProjectIds } } },
          { comment: { task: { projectId: { in: existingDemoProjectIds } } } },
        ],
      },
    });
    await prisma.comment.deleteMany({
      where: { task: { projectId: { in: existingDemoProjectIds } } },
    });
    await prisma.task.deleteMany({
      where: { projectId: { in: existingDemoProjectIds } },
    });
    await prisma.taskStatus.deleteMany({
      where: { projectId: { in: existingDemoProjectIds } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: existingDemoProjectIds } },
    });
  }

  for (const template of templates) {
    const project = await prisma.project.create({
      data: {
        name: template.name,
        prefix: template.prefix,
        description: template.description,
        startDate: template.startDate,
        deadline: template.deadline,
        statuses: { create: defaultStatuses },
      },
      include: { statuses: true },
    });

    for (const [index, task] of template.tasks.entries()) {
      const status = project.statuses.find(item => item.name === task.status) || project.statuses[0];
      const selectedAssignee = users[task.assignee % users.length];
      const assignee = selectedAssignee.role === "USER" ? selectedAssignee : fallbackAssignee;
      const createdTask = await prisma.task.create({
        data: {
          ticketId: `${project.prefix}-${index + 1}`,
          title: task.title,
          description: `<p>${task.title} for ${project.name}.</p>`,
          type: task.type || "TASK",
          category: task.category || "General",
          priority: task.priority || "MEDIUM",
          blockedReason: task.blockedReason || (task.status === "Blocked" ? "Waiting for an external dependency before work can continue." : null),
          storyPoints: task.points,
          loggedTime: task.status === "Done" ? task.points : 0,
          deadline: dateFromToday(task.due),
          statusId: status.id,
          projectId: project.id,
          ownerId: assignee.id,
          assigneeId: assignee.id,
        },
      });

      await prisma.taskHistory.create({
        data: {
          taskId: createdTask.id,
          userId: assignee.id,
          oldStatus: null,
          newStatus: status.name,
        },
      });
    }
  }

  console.log(`Seeded ${templates.length} demo projects with ${templates.reduce((sum, project) => sum + project.tasks.length, 0)} tasks.`);
  console.log("Demo login: admin.demo@digibooking.local / demo1234");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
