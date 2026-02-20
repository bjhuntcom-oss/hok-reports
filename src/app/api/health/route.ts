import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
  };

  // 1. Check DATABASE_URL format (masked)
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not set", diagnostics });
  }

  try {
    const url = new URL(rawUrl);
    diagnostics.dbUrlParsed = {
      protocol: url.protocol,
      username: url.username.substring(0, 10) + "...",
      host: url.hostname,
      port: url.port,
      database: url.pathname,
      searchParams: url.search,
    };
  } catch (e: any) {
    diagnostics.dbUrlParseError = e.message;
  }

  // 2. Test raw pg Pool connection (bypass Prisma entirely)
  try {
    const url = new URL(rawUrl);
    const pool = new Pool({
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: parseInt(url.port || "5432"),
      database: url.pathname.slice(1),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    const client = await pool.connect();
    const result = await client.query("SELECT current_user, current_database(), version()");
    client.release();
    await pool.end();

    diagnostics.rawPgConnection = {
      ok: true,
      currentUser: result.rows[0].current_user,
      currentDatabase: result.rows[0].current_database,
      version: result.rows[0].version?.substring(0, 80),
    };
  } catch (e: any) {
    diagnostics.rawPgConnection = {
      ok: false,
      error: e.message,
      code: e.code,
    };
  }

  // 3. Test Prisma connection
  try {
    const prisma = (await import("@/lib/prisma")).default;
    const count = await prisma.user.count();
    diagnostics.prismaConnection = { ok: true, userCount: count };
  } catch (e: any) {
    diagnostics.prismaConnection = {
      ok: false,
      error: e.message,
      stack: e.stack?.substring(0, 300),
    };
  }

  const allOk = (diagnostics.rawPgConnection as any)?.ok && (diagnostics.prismaConnection as any)?.ok;
  return NextResponse.json({ ok: allOk, diagnostics }, { status: allOk ? 200 : 500 });
}
