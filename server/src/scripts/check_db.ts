// server/src/scripts/check_db.ts
import { prisma } from "../db/prisma";

async function main() {
  try {
    const url = process.env.DATABASE_URL || "";
    const masked = url.replace(/:([^@]+)@/, ":****@");
    console.log("Checking DB connection with URL:", masked);
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables in DB:", tables);
    await prisma.$disconnect();
  } catch (err) {
    console.error("DB Check Failed:", err);
    process.exit(1);
  }
}

main();
