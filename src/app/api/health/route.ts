import { NextResponse } from "next/server";
import { Pool } from "pg";
import tls from "tls";

async function testPoolConnection(label: string, config: Record<string, unknown>) {
  try {
    const pool = new Pool({ ...config, connectionTimeoutMillis: 10000 } as any);
    const client = await pool.connect();
    const result = await client.query("SELECT current_user, current_database()");
    client.release();
    await pool.end();
    return {
      label,
      ok: true,
      currentUser: result.rows[0].current_user,
      currentDatabase: result.rows[0].current_database,
    };
  } catch (e: any) {
    return { label, ok: false, error: e.message, code: e.code };
  }
}

async function testTlsSni(host: string, port: number): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false,
    }, () => {
      const cert = socket.getPeerCertificate();
      resolve({
        ok: true,
        authorized: socket.authorized,
        sniSent: (socket as any).servername || host,
        certSubject: cert?.subject?.CN,
        certIssuer: cert?.issuer?.CN,
      });
      socket.end();
    });
    socket.on("error", (err: any) => {
      resolve({ ok: false, error: err.message });
    });
    socket.setTimeout(8000, () => {
      resolve({ ok: false, error: "TLS timeout" });
      socket.destroy();
    });
  });
}

export async function GET() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not set" });
  }

  const url = new URL(rawUrl);
  const host = url.hostname;
  const port = parseInt(url.port || "5432");
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = url.pathname.slice(1);

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    dbHost: host,
    dbPort: port,
    dbUser: user.substring(0, 20) + "...",
    nodeVersion: process.version,
  };

  // 1. TLS SNI handshake test
  diagnostics.tlsSni = await testTlsSni(host, port);

  // 2. Test A: connectionString direct (how most people use it)
  const testA = await testPoolConnection("connectionString_direct", {
    connectionString: rawUrl,
    ssl: { rejectUnauthorized: false },
  });

  // 3. Test B: explicit params + servername in SSL
  const testB = await testPoolConnection("explicit_servername", {
    user, password, host, port, database,
    ssl: { rejectUnauthorized: false, servername: host },
  });

  // 4. Test C: session mode port 5432 (same host)
  const sessionUrl = rawUrl.replace(":6543/", ":5432/").replace("?pgbouncer=true", "");
  const testC = await testPoolConnection("session_mode_5432", {
    connectionString: sessionUrl,
    ssl: { rejectUnauthorized: false },
  });

  // 5. Test D: PrismaPg with connectionString (no Pool)
  let testD: Record<string, unknown> = { label: "prisma_pg_direct" };
  try {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("@/generated/prisma/client");
    const adapter = new PrismaPg({ connectionString: rawUrl });
    const prisma = new PrismaClient({ adapter });
    const count = await prisma.user.count();
    testD = { ...testD, ok: true, userCount: count };
    await prisma.$disconnect();
  } catch (e: any) {
    testD = { ...testD, ok: false, error: e.message };
  }

  diagnostics.tests = [testA, testB, testC, testD];

  const anyOk = [testA, testB, testC, testD].some((t: any) => t.ok);
  return NextResponse.json({ ok: anyOk, diagnostics }, { status: anyOk ? 200 : 500 });
}
