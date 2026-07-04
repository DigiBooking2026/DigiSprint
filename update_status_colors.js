const fs = require("node:fs");
const path = require("node:path");

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
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

const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient();

const pastelColors = {
  backlog: "#e2e8f0",
  "to do": "#bae6fd",
  "in progress": "#fef08a",
  review: "#ddd6fe",
  testing: "#fbcfe8",
  qa: "#a7f3d0",
  done: "#bbf7d0",
  blocked: "#fecaca",
  cancelled: "#cbd5e1"
};

async function run() {
  console.log("Fetching task statuses from database...");
  const statuses = await prisma.taskStatus.findMany();
  console.log(`Found ${statuses.length} status records.`);

  let updatedCount = 0;
  for (const status of statuses) {
    const nameLower = status.name.toLowerCase();
    let targetColor = null;

    if (nameLower.includes("backlog")) {
      targetColor = pastelColors.backlog;
    } else if (nameLower.includes("to do") || nameLower.includes("todo")) {
      targetColor = pastelColors["to do"];
    } else if (nameLower.includes("in progress") || nameLower.includes("progress")) {
      targetColor = pastelColors["in progress"];
    } else if (nameLower.includes("review")) {
      targetColor = pastelColors.review;
    } else if (nameLower.includes("testing")) {
      targetColor = pastelColors.testing;
    } else if (nameLower.includes("qa")) {
      targetColor = pastelColors.qa;
    } else if (nameLower.includes("done")) {
      targetColor = pastelColors.done;
    } else if (nameLower.includes("blocked")) {
      targetColor = pastelColors.blocked;
    } else if (nameLower.includes("cancelled")) {
      targetColor = pastelColors.cancelled;
    }

    if (targetColor && status.color !== targetColor) {
      console.log(`Updating "${status.name}" (ID: ${status.id}): ${status.color} -> ${targetColor}`);
      await prisma.taskStatus.update({
        where: { id: status.id },
        data: { color: targetColor }
      });
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} task status color records to pastel colors!`);
  await prisma.$disconnect();
}

run().catch(err => {
  console.error("Error executing script:", err);
  process.exit(1);
});
