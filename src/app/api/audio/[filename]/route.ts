import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile, stat } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".webm": "audio/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "audio/mp4",
  ".m4a": "audio/mp4",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { filename } = await params;

    // Security: only allow safe filenames (alphanumeric, dash, dot)
    if (!filename || !/^[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+$/.test(filename)) {
      return NextResponse.json({ error: "Nom de fichier invalide" }, { status: 400 });
    }

    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
    }

    // Search order: data/audio/ → public/uploads/audio/ → public/uploads/
    const candidates = [
      path.join(process.cwd(), "data", "audio", filename),
      path.join(process.cwd(), "public", "uploads", "audio", filename),
      path.join(process.cwd(), "public", "uploads", filename),
    ];

    // Verify all resolved paths stay within project directory
    const projectRoot = path.resolve(process.cwd());
    for (const c of candidates) {
      if (!path.resolve(c).startsWith(projectRoot)) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    }

    // Find file in first available location
    let filePath: string | null = null;
    for (const c of candidates) {
      try {
        await stat(c);
        filePath = c;
        break;
      } catch { /* try next */ }
    }
    if (!filePath) {
      return NextResponse.json({ error: "Fichier audio non trouvé" }, { status: 404 });
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const isDownload = req.nextUrl.searchParams.get("download") === "1";

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    };

    if (isDownload) {
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error("Audio serve error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
