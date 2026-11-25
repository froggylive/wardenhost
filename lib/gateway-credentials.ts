import { prisma } from "@/lib/prisma";

/**
 * Gateway credentials live in their own table and are only ever read by
 * server-side payment code. They are deliberately NOT part of website settings,
 * which are serialized to public pages.
 */
export const GATEWAY_KEYS = [
  "FAMPAY_API_KEY",
  "FAMPAY_UPI_ID",
  "FAMPAY_MERCHANT_NAME",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PANEL_API_URL",
  "PANEL_API_KEY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
] as const;

export type GatewayKey = (typeof GATEWAY_KEYS)[number];

function envFallback(key: string) {
  return (process.env[key] || "").trim();
}

export async function getCredential(key: GatewayKey | string): Promise<string> {
  const row = await prisma.gatewayCredential.findUnique({ where: { key } });
  return row?.value?.trim() || envFallback(key);
}

export async function getCredentials(keys: GatewayKey[] = [...GATEWAY_KEYS]) {
  const result = {} as Record<GatewayKey, string>;
  await Promise.all(
    keys.map(async (key) => {
      result[key] = await getCredential(key);
    })
  );
  return result;
}

/** Blank values are ignored so masked fields can be left untouched. */
export async function setGatewayCredentials(values: Partial<Record<GatewayKey, string>>) {
  for (const key of GATEWAY_KEYS) {
    const value = (values[key] || "").trim();
    if (!value) continue;
    await prisma.gatewayCredential.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

export async function setCredential(key: string, value: string) {
  if (!value.trim()) return;
  await prisma.gatewayCredential.upsert({
    where: { key },
    update: { value: value.trim() },
    create: { key, value: value.trim() },
  });
}

export async function clearGatewayCredential(key: GatewayKey | string) {
  await prisma.gatewayCredential.deleteMany({ where: { key } });
}

export async function getGatewayCredentialStatus(): Promise<Record<GatewayKey, boolean>> {
  const credentials = await getCredentials();
  return Object.fromEntries(
    GATEWAY_KEYS.map((key) => [key, credentials[key].length > 0])
  ) as Record<GatewayKey, boolean>;
}
