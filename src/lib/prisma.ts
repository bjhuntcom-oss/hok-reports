import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const dbUrl = new URL(process.env.DATABASE_URL!);
const pool = new Pool({
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || "5432"),
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: false, servername: dbUrl.hostname },
});

const adapter = new PrismaPg(pool);

const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
