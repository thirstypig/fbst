import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Testing database connection...");
  try {
    await prisma.$connect();
    console.log("✅ Successfully connected to database!");
    const count = await prisma.user.count();
    console.log(`✅ Current user count: ${count}`);
  } catch (e) {
    console.error("❌ Connection failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
