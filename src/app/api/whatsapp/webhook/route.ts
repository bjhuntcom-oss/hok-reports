import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  detectHearingReportAI,
  parseWhatsAppMessageAI,
} from "@/lib/whatsapp-parser";
import {
  getVerifyToken,
  isWhatsAppConfigured,
  sendReportConfirmation,
  sendParseErrorReply,
} from "@/lib/whatsapp";

/**
 * GET /api/whatsapp/webhook
 * WhatsApp Cloud API webhook verification endpoint.
 * Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = getVerifyToken();

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[WhatsApp Webhook] Verification failed", { mode, token });
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST /api/whatsapp/webhook
 * Receives incoming WhatsApp messages and processes hearing reports.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // WhatsApp Cloud API sends a specific structure
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return NextResponse.json({ status: "ok" });
    }

    // Process incoming messages
    const messages = value.messages || [];

    for (const message of messages) {
      // Only process text messages
      if (message.type !== "text") continue;

      const text = message.text?.body;
      const senderId = message.from; // phone number
      const messageId = message.id;
      const senderName = value.contacts?.[0]?.profile?.name || senderId;

      if (!text) continue;

      console.log(`[WhatsApp] Message from ${senderName} (${senderId}): ${text.substring(0, 100)}...`);

      // AI-powered detection: does this message contain a hearing report?
      const detection = await detectHearingReportAI(text);
      console.log(`[WhatsApp AI] Detection result: isReport=${detection.isReport}, confidence=${detection.confidence}`);

      if (!detection.isReport) {
        console.log("[WhatsApp] Message does not appear to be a hearing report, skipping");
        continue;
      }

      // AI-powered parsing: extract structured data from the message
      const parsed = await parseWhatsAppMessageAI(text, senderName);

      if (!parsed) {
        console.log("[WhatsApp] Could not parse hearing report from message");
        if (isWhatsAppConfigured()) {
          await sendParseErrorReply(senderId);
        }
        continue;
      }

      console.log(`[WhatsApp AI] Parsed: client=${parsed.clientName}, ref=${parsed.caseReference}, next=${parsed.nextHearingDate}`);

      // Find a default user to associate the report with
      // First try to match by WhatsApp sender name to an existing user
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { name: { contains: senderName } },
            { name: { contains: parsed.lawyerName || "__no_match__" } },
          ],
          status: "active",
        },
      });

      // If no match, use the first admin user
      if (!user) {
        user = await prisma.user.findFirst({
          where: { role: "admin", status: "active" },
        });
      }

      if (!user) {
        console.error("[WhatsApp] No active user found to associate the report with");
        continue;
      }

      // Check for duplicate (same WhatsApp message ID)
      if (messageId) {
        const existing = await prisma.hearingReport.findFirst({
          where: { whatsappMessageId: messageId },
        });
        if (existing) {
          console.log(`[WhatsApp] Duplicate message ${messageId}, skipping`);
          continue;
        }
      }

      // Create the hearing report
      const report = await prisma.hearingReport.create({
        data: {
          hearingDate: new Date(parsed.hearingDate || new Date().toISOString().split("T")[0]),
          jurisdiction: parsed.jurisdiction || "Non spécifié",
          chamber: parsed.chamber || null,
          caseReference: parsed.caseReference || "Non spécifié",
          clientName: parsed.clientName || "Non spécifié",
          opponent: parsed.opponent || null,
          lawyerName: parsed.lawyerName || senderName,
          outcome: parsed.outcome || text.substring(0, 500),
          nextHearingDate: parsed.nextHearingDate ? new Date(parsed.nextHearingDate) : null,
          tasks: parsed.tasks.length > 0 ? JSON.stringify(parsed.tasks) : null,
          notes: parsed.notes || null,
          source: "whatsapp",
          whatsappMessageId: messageId || null,
          whatsappSender: senderName,
          userId: user.id,
        },
      });

      console.log(`[WhatsApp] Created hearing report ${report.id} from message ${messageId}`);

      // Send confirmation back to WhatsApp
      if (isWhatsAppConfigured()) {
        await sendReportConfirmation(
          senderId,
          parsed.clientName || "Non spécifié",
          parsed.caseReference || "Non spécifié",
          parsed.nextHearingDate
        );
      }
    }

    // WhatsApp requires a 200 response
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    // Always return 200 to WhatsApp to avoid retries
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
