/**
 * WhatsApp Cloud API Helper
 * 
 * Handles sending messages via the WhatsApp Business Cloud API.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

function getConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
  };
}

export function isWhatsAppConfigured(): boolean {
  const config = getConfig();
  return !!(config.accessToken && config.phoneNumberId && config.verifyToken);
}

export function getVerifyToken(): string {
  return getConfig().verifyToken;
}

/**
 * Send a text message via WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  const config = getConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    console.warn("[WhatsApp] Not configured, skipping message send");
    return false;
  }

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[WhatsApp] Send message error:", err);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[WhatsApp] Send message exception:", error);
    return false;
  }
}

/**
 * Send a confirmation reply after successfully parsing a hearing report
 */
export async function sendReportConfirmation(
  to: string,
  clientName: string,
  caseReference: string,
  nextHearingDate: string | null
): Promise<boolean> {
  let message = `✅ *Compte rendu enregistré*\n\n`;
  message += `📋 *${clientName}* — ${caseReference}\n`;
  if (nextHearingDate) {
    message += `📅 Prochaine audience: ${nextHearingDate}\n`;
  }
  message += `\nLe rôle hebdomadaire a été mis à jour automatiquement.`;

  return sendWhatsAppMessage(to, message);
}

/**
 * Send an error reply when a message couldn't be parsed
 */
export async function sendParseErrorReply(to: string): Promise<boolean> {
  const message =
    `⚠️ *Message non reconnu*\n\n` +
    `Pour enregistrer un compte rendu, utilisez ce format :\n\n` +
    `📋 COMPTE RENDU\n` +
    `Date: JJ/MM/AAAA\n` +
    `Client: Nom du client\n` +
    `Dossier: RG 2026/XXXX\n` +
    `Juridiction: TPI Cotonou\n` +
    `Chambre: 1ère Ch. civile\n` +
    `Adverse: Partie adverse\n` +
    `Avocat: Me Nom\n` +
    `Résumé: Ce qui s'est passé à l'audience...\n` +
    `Prochaine: JJ/MM/AAAA\n` +
    `Tâches: Tâche 1, Tâche 2`;

  return sendWhatsAppMessage(to, message);
}

/**
 * Validate incoming webhook payload signature (optional security)
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  appSecret: string
): boolean {
  if (!appSecret || !signature) return true; // Skip if not configured
  try {
    // In production, verify HMAC-SHA256 signature
    // For now, accept all requests
    return true;
  } catch {
    return false;
  }
}
