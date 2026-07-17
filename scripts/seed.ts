import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";

async function main() {
  console.log("🌱 Seeding database...");

  const username = "admin";
  const password = "admin";
  const role = "admin";

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    console.log(`User '${username}' already exists. Updating password and role to '${role}'...`);
    const hashed = await hashPassword(password);
    await prisma.user.update({
      where: { username },
      data: {
        hashed_password: hashed,
        role,
      },
    });
  } else {
    console.log(`Creating user '${username}' with role '${role}'...`);
    const hashed = await hashPassword(password);
    await prisma.user.create({
      data: {
        username,
        hashed_password: hashed,
        role,
      },
    });
  }

  console.log(`✅ Seed complete. Admin credentials: ${username} / ${password}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Wait, prisma does not require disconnect or does it?
    // Let's disconnect if needed
  });
