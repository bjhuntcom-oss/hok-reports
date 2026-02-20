import { NextResponse } from "next/server";
import { Pool } from "pg";
import dns from "dns";

async function testPoolConnection(label: string, config: Record<string, unknown>) {
  try {
    const pool = new Pool({ ...config, connectionTimeoutMillis: 10000 } as any);
    const client = await pool.connect();
    const result = await client.query("SELECT current_user, current_database(), inet_server_addr()");
    client.release();
    await pool.end();
    return {
      label,
      ok: true,
      currentUser: result.rows[0].current_user,
      currentDatabase: result.rows[0].current_database,
      serverAddr: result.rows[0].inet_server_addr,
    };
  } catch (e: any) {
    return { label, ok: false, error: e.message, code: e.code };
  }
}

export async function GET() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not set" });
  }

  const url = new URL(rawUrl);
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    dbHost: url.hostname,
    dbPort: url.port,
    dbUser: url.username.substring(0, 15) + "...",
  };

  // 1. DNS resolution check
  try {
    const addresses = await dns.promises.resolve(url.hostname);
    const addresses6 = await dns.promises.resolve6(url.hostname).catch(() => []);
    diagnostics.dns = { ipv4: addresses, ipv6: addresses6 };
  } catch (e: any) {
    diagnostics.dns = { error: e.message };
  }

  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const host = url.hostname;
  const port = parseInt(url.port || "5432");
  const database = url.pathname.slice(1);

  // 2. Test A: connectionString direct to Pool
  const testA = await testPoolConnection("connectionString_direct", {
    connectionString: rawUrl,
    ssl: { rejectUnauthorized: false },
  });

  // 3. Test B: explicit params + SSL with servername
  const testB = await testPoolConnection("explicit_with_servername", {
    user, password, host, port, database,
    ssl: { rejectUnauthorized: false, servername: host },
  });

  // 4. Test C: explicit params + ssl=true
  const testC = await testPoolConnection("explicit_ssl_true", {
    user, password, host, port, database,
    ssl: true,
  });

  // 5. Test D: connectionString with sslmode param
  const urlWithSsl = rawUrl.includes("?") ? rawUrl + "&sslmode=require" : rawUrl + "?sslmode=require";
  const testD = await testPoolConnection("connectionString_sslmode", {
    connectionString: urlWithSsl,
    ssl: { rejectUnauthorized: false },
  });

  diagnostics.tests = [testA, testB, testC, testD];

  const anyOk = [testA, testB, testC, testD].some(t => t.ok);
  return NextResponse.json({ ok: anyOk, diagnostics }, { status: anyOk ? 200 : 500 });
}
