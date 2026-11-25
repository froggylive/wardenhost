"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/upload";
import { announcementSchema, billingPeriodSchema } from "@/lib/validation";
import { GATEWAY_KEYS, clearGatewayCredential, setGatewayCredentials, type GatewayKey } from "@/lib/gateway-credentials";

/** Owner-locked values. Ignored by the generic settings action even if a
 * crafted form submits them. */
const LOCKED_SETTING_KEYS = new Set([
  "creditName",
  "creditUrl",
  "copyrightOwner",
  "termsContent",
  "copyrightContent",
  "privacyContent",
]);

export async function saveSettingValuesAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const keys: string[] = [];
  for (const [rawKey, value] of formData.entries()) {
    if (LOCKED_SETTING_KEYS.has(rawKey)) continue;
    if (rawKey.startsWith("file_")) {
      const key = rawKey.slice(5);
      if (value instanceof File && value.size > 0) {
        const saved = await saveUpload(value, "image");
        if (!saved.ok) return { error: saved.error };
        await prisma.websiteSetting.upsert({ where: { key }, update: { value: JSON.stringify(saved.url) }, create: { key, value: JSON.stringify(saved.url) } });
        keys.push(key);
      }
      continue;
    }
    if (rawKey.startsWith("_")) continue;
    const str = String(value);
    let parsedValue: unknown = str;
    if (str === "true") parsedValue = true;
    else if (str === "false") parsedValue = false;
    else if (str.startsWith("[")) { try { parsedValue = JSON.parse(str); } catch { parsedValue = str; } }
    else if (/^-?\d+(\.\d+)?$/.test(str) && !str.startsWith("0") && str.length < 10) parsedValue = Number(str);
    await prisma.websiteSetting.upsert({
      where: { key: rawKey },
      update: { value: JSON.stringify(parsedValue) },
      create: { key: rawKey, value: JSON.stringify(parsedValue) },
    });
    keys.push(rawKey);
  }
  await audit(admin.id, "UPDATE", "WebsiteSettings", undefined, keys.join(", "));
  revalidatePath("/");
  revalidatePath("/admin/content");
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function saveGatewayCredentialsAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const values: Partial<Record<GatewayKey, string>> = {};
  const cleared: string[] = [];

  for (const key of GATEWAY_KEYS) {
    if (formData.get(`clear_${key}`) === "on") {
      // Environment variables still count as configured; DB row is removed so
      // an admin-stored value cannot silently override the environment.
      await clearGatewayCredential(key);
      cleared.push(key);
      continue;
    }
    const raw = formData.get(key);
    if (typeof raw === "string" && raw.trim()) values[key] = raw.trim();
  }

  await setGatewayCredentials(values);

  // Saving credentials also enables the matching gateway, so admins never end
  // up with a "configured but disabled" payment method.
  const enableCodes: string[] = [];
  if (values.FAMPAY_API_KEY || values.FAMPAY_UPI_ID) enableCodes.push("fampay");
  if (values.RAZORPAY_KEY_ID || values.RAZORPAY_KEY_SECRET) enableCodes.push("razorpay");
  if (values.STRIPE_SECRET_KEY) enableCodes.push("stripe");
  if (enableCodes.length) {
    await prisma.paymentMethod.updateMany({
      where: { code: { in: enableCodes } },
      data: { enabled: true },
    });
  }

  await audit(admin.id, "UPDATE", "GatewayCredentials", undefined, `Updated: ${Object.keys(values).join(", ") || "none"}${cleared.length ? ` | Cleared: ${cleared.join(", ")}` : ""}`);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function saveCustomGatewayAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const { saveCustomGateway } = await import("@/lib/custom-gateways");
  const name = String(formData.get("name") || "").trim();
  if (name.length < 2) return { error: "Gateway name is required" };
  const config = await saveCustomGateway({
    id: String(formData.get("id") || "") || undefined,
    name,
    description: String(formData.get("description") || "").trim(),
    kind: String(formData.get("kind") || "link") as "link" | "qr" | "manual",
    apiUrl: String(formData.get("apiUrl") || "").trim(),
    apiKey: String(formData.get("apiKey") || ""),
    instructions: String(formData.get("instructions") || "").trim(),
  });
  await audit(admin.id, "UPSERT", "CustomGateway", config.code, config.name);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function deleteCustomGatewayAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const code = String(formData.get("code") || "");
  if (!code.startsWith("custom_")) return { error: "Invalid gateway" };
  const { deleteCustomGateway } = await import("@/lib/custom-gateways");
  await deleteCustomGateway(code);
  await audit(admin.id, "DELETE", "CustomGateway", code);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function toggleCustomGatewayAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const code = String(formData.get("code") || "");
  const enabled = formData.get("enabled") === "true";
  if (!code.startsWith("custom_")) return { error: "Invalid gateway" };
  const { toggleCustomGateway } = await import("@/lib/custom-gateways");
  await toggleCustomGateway(code, enabled);
  await audit(admin.id, "TOGGLE", "CustomGateway", code, `Enabled: ${enabled}`);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function createAnnouncementAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const parsed = announcementSchema.safeParse({
    title: String(formData.get("title") || ""), message: String(formData.get("message") || ""),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const a = await prisma.announcement.create({ data: parsed.data });
  await audit(admin.id, "CREATE", "Announcement", a.id, parsed.data.title);
  revalidatePath("/");
  revalidatePath("/announcements");
  return { ok: true };
}

export async function updateAnnouncementAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = announcementSchema.safeParse({
    title: String(formData.get("title") || ""), message: String(formData.get("message") || ""),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.announcement.update({ where: { id }, data: parsed.data });
  await audit(admin.id, "UPDATE", "Announcement", id, parsed.data.title);
  revalidatePath("/");
  revalidatePath("/announcements");
  return { ok: true };
}

export async function deleteAnnouncementAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  await prisma.announcement.delete({ where: { id } });
  await audit(admin.id, "DELETE", "Announcement", id);
  revalidatePath("/");
  return { ok: true };
}

export async function saveBillingPeriodAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = billingPeriodSchema.safeParse({
    code: String(formData.get("code") || ""), label: String(formData.get("label") || ""),
    months: String(formData.get("months") || 1), multiplier: String(formData.get("multiplier") || 1),
    active: formData.get("active") === "on", displayOrder: String(formData.get("displayOrder") || 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (id) await prisma.billingPeriod.update({ where: { id }, data: parsed.data });
  else await prisma.billingPeriod.create({ data: parsed.data });
  await audit(admin.id, id ? "UPDATE" : "CREATE", "BillingPeriod", id || undefined, parsed.data.label);
  revalidatePath("/admin/settings");
  revalidatePath("/order");
  return { ok: true };
}

export async function togglePaymentMethodAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const code = String(formData.get("code") || "");
  const method = await prisma.paymentMethod.findUnique({ where: { code } });
  if (!method) return { error: "Payment method not found" };
  await prisma.paymentMethod.update({ where: { code }, data: { enabled: !method.enabled } });
  await audit(admin.id, "TOGGLE", "PaymentMethod", code, `Enabled: ${!method.enabled}`);
  revalidatePath("/admin/settings");
  revalidatePath("/client/invoices");
  revalidatePath("/order");
  return { ok: true };
}
