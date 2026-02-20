import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("Admin123#", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@hokreports.com" },
    update: { password: adminPassword },
    create: {
      name: "Administrateur",
      email: "admin@hokreports.com",
      password: adminPassword,
      role: "admin",
      status: "active",
      language: "fr",
    },
  });
  console.log("Admin created:", admin.email);

  // Create test user
  const userPassword = await bcrypt.hash("User123#", 12);
  const user = await prisma.user.upsert({
    where: { email: "user1@hokreports.com" },
    update: { password: userPassword },
    create: {
      name: "Ma\u00eetre Dupont",
      email: "user1@hokreports.com",
      password: userPassword,
      role: "user",
      status: "active",
      language: "fr",
    },
  });
  console.log("User created:", user.email);

  // Clean up old test user if exists
  try {
    await prisma.user.delete({ where: { email: "avocat@cabinet.fr" } });
    console.log("Old test user removed: avocat@cabinet.fr");
  } catch {}

  console.log("\nSeeding complete!");
  console.log("---");
  console.log("Admin: admin@hokreports.com / Admin123#");
  console.log("User:  user1@hokreports.com / User123#");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
