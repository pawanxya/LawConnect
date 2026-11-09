import crypto from "node:crypto";
import { db } from "./storage.js";

/**
 * Webhook Dispatcher Service
 * Signs payload with HMAC-SHA256 and notifies client's webhook endpoint
 */
export async function dispatchWebhook({ merchantId, event, data }) {
  const merchant = db.getMerchant(merchantId);
  if (!merchant || !merchant.webhookUrl) {
    console.log(`[WEBHOOK] No webhook URL configured for merchant ${merchantId}`);
    return;
  }

  const payload = {
    id: "evt_" + crypto.randomUUID().slice(0, 12),
    event, // e.g. "payment.authorized", "payment.failed", "refund.processed"
    created_at: new Date().toISOString(),
    data
  };

  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", merchant.apiSecret || "default_secret")
    .update(`${timestamp}.${payloadString}`)
    .digest("hex");

  const headers = {
    "Content-Type": "application/json",
    "X-Gateway-Event": event,
    "X-Gateway-Signature": signature,
    "X-Gateway-Timestamp": String(timestamp),
    "User-Agent": "ApexPay-Webhook-Engine/1.0"
  };

  const webhookLog = {
    id: payload.id,
    merchantId,
    event,
    targetUrl: merchant.webhookUrl,
    payload,
    signature,
    timestamp,
    status: "PENDING",
    attempts: 1,
    createdAt: new Date().toISOString()
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(merchant.webhookUrl, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal
    });

    clearTimeout(timeout);

    webhookLog.status = response.ok ? "DELIVERED" : "FAILED";
    webhookLog.responseCode = response.status;
    webhookLog.responseText = await response.text().catch(() => "");
    console.log(`[WEBHOOK] Dispatched event ${event} to ${merchant.webhookUrl} - HTTP ${response.status}`);
  } catch (err) {
    webhookLog.status = "ERROR";
    webhookLog.errorMessage = err.message;
    console.log(`[WEBHOOK] Delivery failed to ${merchant.webhookUrl}: ${err.message}`);
  }

  db.logWebhook(webhookLog);
  return webhookLog;
}
