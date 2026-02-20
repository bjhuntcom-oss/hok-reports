import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * POST /api/whatsapp/test
 * Simulates a WhatsApp webhook message for testing purposes.
 * Admin-only. Sends a fake WhatsApp payload to the webhook handler.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { message, senderName } = body;

    if (!message) {
      return NextResponse.json({ error: "Le champ 'message' est requis" }, { status: 400 });
    }

    // Build a fake WhatsApp Cloud API payload
    const fakePayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "FAKE_BUSINESS_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "229000000",
                  phone_number_id: "FAKE_PHONE_ID",
                },
                contacts: [
                  {
                    profile: { name: senderName || "Test WhatsApp" },
                    wa_id: "22990000000",
                  },
                ],
                messages: [
                  {
                    from: "22990000000",
                    id: `test_${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body: message },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    // Call the webhook handler internally
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/whatsapp/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fakePayload),
    });

    const result = await res.json();

    return NextResponse.json({
      success: true,
      message: "Message de test envoyé au webhook",
      webhookResponse: result,
    });
  } catch (error) {
    console.error("POST whatsapp/test error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
