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

    // Try new location first (data/audio/), then legacy (public/uploads/audio/)
    const newPath = path.join(process.cwd(), "data", "audio", filename);
    const legacyPath = path.join(process.cwd(), "public", "uploads", "audio", filename);

    // Verify resolved paths are within their respective directories
    const audioDir = path.resolve(path.join(process.cwd(), "data", "audio"));
    const legacyDir = path.resolve(path.join(process.cwd(), "public", "uploads", "audio"));
    const resolvedNew = path.resolve(newPath);
    const resolvedLegacy = path.resolve(legacyPath);
    if (!resolvedNew.startsWith(audioDir) || !resolvedLegacy.startsWith(legacyDir)) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    // Find file in new or legacy location
    let filePath: string | null = null;
    try {
      await stat(newPath);
      filePath = newPath;
    } catch {
      try {
        await stat(legacyPath);
        filePath = legacyPath;
      } catch {
        return NextResponse.json({ error: "Fichier audio non trouvé" }, { status: 404 });
      }
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
