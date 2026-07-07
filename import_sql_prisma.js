const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const sqlPath = path.join(__dirname, '..', 'zsocial', 'zsocial_seed.sql');
  console.log(`Reading SQL seed file from: ${sqlPath}`);
  
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ SQL seed file not found!');
    return;
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split SQL queries by semicolon followed by newline
  const cleanSql = sql
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

  const statements = cleanSql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log(`Executing ${statements.length} SQL statements on local database...`);
  console.log('--- First 25 Parsed Statements ---');
  for (let i = 0; i < Math.min(25, statements.length); i++) {
    console.log(`[${i}]: "${statements[i].substring(0, 100)}..."`);
  }
  console.log('----------------------------------');
  
  try {
    // Disable FK checks first
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.startsWith('SET FOREIGN_KEY_CHECKS')) continue; // Skip redundant FK check toggles
      
      if (stmt.toLowerCase().includes('insert into `project`')) {
        console.log(`Executing project insert statement [index ${i}]:`, stmt);
      }
      if (stmt.toLowerCase().includes('delete from `project`')) {
        console.log(`Executing project delete statement [index ${i}]:`, stmt);
      }
      
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (err) {
        console.error(`❌ Statement failed at index ${i}:`, stmt);
        console.error(err);
        throw err;
      }
    }

    // Re-enable FK checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('✅ Database seeded successfully via Prisma!');
  } catch (err) {
    console.error('❌ Database execution failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
