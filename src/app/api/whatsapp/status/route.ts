import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

/**
 * GET /api/whatsapp/status
 * Returns the WhatsApp integration status (configured or not).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const configured = isWhatsAppConfigured();
    const webhookUrl = `${process.env.NEXTAUTH_URL || "https://votre-domaine.com"}/api/whatsapp/webhook`;
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";

    return NextResponse.json({
      configured,
      webhookUrl,
      verifyToken: configured ? verifyToken : "",
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? "***configuré***" : "",
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? "***configuré***" : "",
    });
  } catch (error) {
    console.error("GET whatsapp/status error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
