const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const p = await prisma.project.findUnique({ where: { id: "cmq9920ng000ujnawk8l1r0j0" }});
  console.log("Project:", p);
}
run();
