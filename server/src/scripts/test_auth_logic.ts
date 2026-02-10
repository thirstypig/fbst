// server/src/scripts/test_auth_logic.ts
import { prisma } from "../db/prisma.js";
import crypto from "crypto";

async function test() {
  console.log("--- Testing Auth Logic ---");

  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "password123";

  // 1. Create User
  console.log(`Creating user: ${testEmail}`);
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash: testPassword, // Mocking hash for verification of storage
      name: "Test User",
    },
  });
  console.log("User created successfully.");

  // 2. Test Reset Token
  console.log("Generating reset token...");
  const resetToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpires: expires },
  });

  const updated = await prisma.user.findUnique({ where: { id: user.id } });
  if (updated?.resetToken === resetToken) {
    console.log("Reset token stored successfully.");
  } else {
    throw new Error("Reset token storage failed");
  }

  // 3. Cleanup
  console.log("Cleaning up test user...");
  await prisma.user.delete({ where: { id: user.id } });
  console.log("Cleanup complete.");

  console.log("--- Auth Logic Verification Passed ---");
}

test().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
