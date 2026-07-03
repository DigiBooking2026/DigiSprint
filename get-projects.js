const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany();
  console.log(projects.map(p => ({ id: p.id, name: p.name })));
}

main().finally(() => prisma.$disconnect());
