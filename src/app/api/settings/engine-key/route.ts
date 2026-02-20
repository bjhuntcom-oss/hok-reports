import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const { key } = await req.json();
    if (!key || typeof key !== "string" || !key.startsWith("sk-")) {
      return NextResponse.json({ error: "Format de clé invalide" }, { status: 400 });
    }

    const envPath = join(process.cwd(), ".env");
    let envContent = "";
    try {
      envContent = readFileSync(envPath, "utf-8");
    } catch {
      envContent = "";
    }

    if (envContent.includes("OPENAI_API_KEY=")) {
      envContent = envContent.replace(/OPENAI_API_KEY=.*/, `OPENAI_API_KEY=${key}`);
    } else {
      envContent += `\nOPENAI_API_KEY=${key}`;
    }

    writeFileSync(envPath, envContent, "utf-8");
    process.env.OPENAI_API_KEY = key;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Engine key update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
