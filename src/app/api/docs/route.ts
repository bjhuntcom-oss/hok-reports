import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { readFileSync } from "fs";
import { join } from "path";

const DOCS_PASSWORD = process.env.DOCS_PASSWORD || "HokDocs2026#";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `docs:${ip}`;

    // Strict rate limiting: 5 attempts per 15 minutes
    const { allowed, remaining } = rateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans 15 minutes." },
        {
          status: 429,
          headers: {
            "Retry-After": "900",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const { password } = await req.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
    }

    if (password !== DOCS_PASSWORD) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        {
          status: 401,
          headers: { "X-RateLimit-Remaining": String(remaining) },
        }
      );
    }

    // Password correct — read the HTML documentation
    const docsPath = join(process.cwd(), "docs", "PLATFORM_DOCUMENTATION.html");
    const html = readFileSync(docsPath, "utf-8");

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    console.error("Docs API error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
