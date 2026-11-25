import { prisma } from "@/lib/prisma";
import { hmacSha256, safeEqual } from "@/lib/crypto";
import { getCredential } from "@/lib/gateway-credentials";
import QRCode from "qrcode";

export type EnabledGateway = {
  code: string;
  name: string;
  description: string | null;
  configured: boolean;
  kind?: string;
};

export type FampayConfig = { upiId: string; merchantName: string; apiKey: string };

/** Server-side only. Never returned to public pages. */
export async function hasFampayApiKey() {
  return !!(await getCredential("FAMPAY_API_KEY"));
}

/**
 * FamPay is a UPI app, so payments are collected with a standard UPI QR and
 * verified by an administrator. The UPI ID can be configured in the admin
 * panel or in the environment (it is not a secret).
 */
export async function getFampayConfig(): Promise<FampayConfig | null> {
  const { getSetting } = await import("@/lib/settings");
  const legacyUpi = String((await getSetting<string>("fampayUpiId", "")) || "").trim();
  const legacyMerchant = String((await getSetting<string>("fampayMerchantName", "")) || "").trim();
  const upiId = (await getCredential("FAMPAY_UPI_ID")) || legacyUpi;
  if (!upiId) return null;
  const merchantName =
    (await getCredential("FAMPAY_MERCHANT_NAME")) || legacyMerchant || "WardenHost";
  return { upiId, merchantName, apiKey: await getCredential("FAMPAY_API_KEY") };
}

/** Gateways are only surfaced when both the DB flag and configuration exist. */
export async function getEnabledGateways(): Promise<EnabledGateway[]> {
  const methods = await prisma.paymentMethod.findMany({ where: { enabled: true }, orderBy: { displayOrder: "asc" } });
  const result: EnabledGateway[] = [];
  for (const m of methods) {
    if (m.code === "razorpay") {
      const key = await getCredential("RAZORPAY_KEY_ID");
      const secret = await getCredential("RAZORPAY_KEY_SECRET");
      if (!key || !secret) continue;
    }
    if (m.code === "stripe") {
      if (!(await getCredential("STRIPE_SECRET_KEY"))) continue;
    }
    if (m.code === "fampay" && !(await isFamGatewayConfigured())) continue;
    if (m.code.startsWith("custom_")) {
      const { getCustomGatewayConfig, getCustomGatewayApiKey } = await import("@/lib/custom-gateways");
      const config = await getCustomGatewayConfig(m.code);
      if (!config) continue;
      if (config.kind === "manual") {
        if (!config.instructions) continue;
      } else if (!(await getCustomGatewayApiKey(m.code)) || !config.apiUrl) {
        continue;
      }
      result.push({ code: m.code, name: m.name, description: m.description, configured: true, kind: config.kind });
      continue;
    }
    result.push({ code: m.code, name: m.name, description: m.description, configured: true });
  }
  return result;
}

export async function isGatewayEnabled(code: string) {
  const row = await prisma.paymentMethod.findUnique({ where: { code } });
  if (!row || !row.enabled) return false;
  if (code === "razorpay") {
    return !!(await getCredential("RAZORPAY_KEY_ID")) && !!(await getCredential("RAZORPAY_KEY_SECRET"));
  }
  if (code === "stripe") return !!(await getCredential("STRIPE_SECRET_KEY"));
  if (code === "fampay") return await isFamGatewayConfigured();
  if (code.startsWith("custom_")) {
    const { getCustomGatewayConfig, getCustomGatewayApiKey } = await import("@/lib/custom-gateways");
    const config = await getCustomGatewayConfig(code);
    if (!config) return false;
    return config.kind === "manual" ? !!config.instructions : !!(config.apiUrl && (await getCustomGatewayApiKey(code)));
  }
  return true;
}

/** FamGateway only needs an API key; a local UPI ID is a legacy fallback. */
export async function isFamGatewayConfigured() {
  if (await hasFampayApiKey()) return true;
  return !!(await getFampayConfig());
}

export type FamGatewayOrder = {
  orderId: string;
  qrUrl: string;
  checkoutUrl: string;
  payableAmount: string;
  upiId: string;
  upiIntent: string;
};

const FAM_BASE = "https://famgateway.in";

export async function createFamGatewayOrder(input: {
  amountCents: number;
  customerName?: string;
  customerEmail?: string;
  webhookUrl?: string;
  redirectUrl?: string;
}): Promise<FamGatewayOrder> {
  const key = await getCredential("FAMPAY_API_KEY");
  if (!key) throw new Error("FamGateway API key is not configured");
  const res = await fetch(`${FAM_BASE}/api/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Api-Key": key,
    },
    body: JSON.stringify({
      amount: input.amountCents / 100,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      webhook_url: input.webhookUrl,
      redirect_url: input.redirectUrl,
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.status !== "success" || !data?.data?.order_id) {
    throw new Error(data?.message || data?.error || "Unable to create FamGateway payment session");
  }
  return {
    orderId: String(data.data.order_id),
    qrUrl: String(data.data.qr_url || ""),
    checkoutUrl: String(data.data.checkout_url || ""),
    payableAmount: String(data.data.payable_amount || data.data.amount || ""),
    upiId: String(data.data.upi_id || ""),
    upiIntent: String(data.data.upi_intent || ""),
  };
}

export async function getFamGatewayOrderStatus(orderId: string) {
  const key = await getCredential("FAMPAY_API_KEY");
  if (!key) throw new Error("FamGateway API key is not configured");
  const url = `${FAM_BASE}/api/verify-order.php?api_key=${encodeURIComponent(key)}&order_id=${encodeURIComponent(orderId)}`;
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Unable to check payment status");
  return data;
}

export async function verifyFamGatewayWebhook(rawBody: string, signature: string) {
  const key = await getCredential("FAMPAY_API_KEY");
  if (!key || !signature) return false;
  return safeEqual(hmacSha256(rawBody, key), signature);
}

/** Builds an NPCI-compatible UPI deep link that FamPay and other UPI apps can scan. */
export function buildUpiUri(input: { upiId: string; merchantName: string; amountCents: number; invoiceNumber: string; currency?: string }) {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.merchantName,
    am: (input.amountCents / 100).toFixed(2),
    cu: input.currency || "INR",
    tn: `Invoice ${input.invoiceNumber}`,
  });
  return `upi://pay?${params.toString()}`;
}

export async function generateQrDataUrl(uri: string) {
  return QRCode.toDataURL(uri, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#050505ff", light: "#ffffffff" },
  });
}

export async function createRazorpayOrder(amountCents: number, receipt: string) {
  const key = await getCredential("RAZORPAY_KEY_ID");
  const secret = await getCredential("RAZORPAY_KEY_SECRET");
  if (!key || !secret) throw new Error("Razorpay is not configured");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountCents, currency: "INR", receipt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || "Unable to create Razorpay order");
  return { id: data.id as string, amount: data.amount as number, keyId: key };
}

export async function verifyRazorpayPayment(orderId: string, paymentId: string, signature: string) {
  const secret = await getCredential("RAZORPAY_KEY_SECRET");
  if (!secret) return false;
  return safeEqual(hmacSha256(`${orderId}|${paymentId}`, secret), signature);
}

export async function verifyRazorpayWebhook(rawBody: string, signature: string) {
  const secret = await getCredential("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return false;
  return safeEqual(hmacSha256(rawBody, secret), signature);
}

export async function createStripeCheckout(input: {
  amountCents: number;
  currency: string;
  description: string;
  invoiceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const secret = await getCredential("STRIPE_SECRET_KEY");
  if (!secret) throw new Error("Stripe is not configured");
  const body = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": input.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(input.amountCents),
    "line_items[0][price_data][product_data][name]": input.description.slice(0, 120),
    success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl,
    client_reference_id: input.invoiceId,
    "metadata[invoiceId]": input.invoiceId,
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Unable to create Stripe checkout");
  return { id: data.id as string, url: data.url as string };
}

export async function retrieveStripeSession(sessionId: string) {
  const secret = await getCredential("STRIPE_SECRET_KEY");
  if (!secret) throw new Error("Stripe is not configured");
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Unable to retrieve Stripe session");
  return data;
}

export async function verifyStripeWebhook(rawBody: string, signature: string) {
  const secret = await getCredential("STRIPE_WEBHOOK_SECRET");
  if (!secret) return false;
  const parts = signature.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {});
  if (!parts.t || !parts.v1) return false;
  return safeEqual(hmacSha256(`${parts.t}.${rawBody}`, secret), parts.v1);
}
