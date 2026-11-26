"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  LICENSE_COOKIE, clearLicenseAdminCookie, domainAllowed, isLicensePanelAuthenticated,
  requestHost, setLicenseAdminCookie,
} from "@/lib/license";

function newLicenseKey() {
  const part = randomBytes(4).toString("hex").toUpperCase();
  return `WARDEN-${part.slice(0, 4)}-${part.slice(4, 8)}-${part.slice(8)}`;
}

export async function licenseLoginAction(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") || "");
  const expected = process.env.LICENSE_PANEL_PASSWORD || "FroggyLive";
  if (password !== expected) return { error: "Incorrect license panel password" };
  setLicenseAdminCookie();
  redirect("/license");
}

export async function licenseLogoutAction() {
  clearLicenseAdminCookie();
  redirect("/license");
}

export async function activateLicenseAction(formData: FormData): Promise<{ error?: string }> {
  const key = String(formData.get("key") || "").trim().toUpperCase();
  if (!key) return { error: "Enter a license key" };
  const host = requestHost();
  const { validateWithLicensePanel } = await import("@/lib/license");

  let license = await prisma.license.findUnique({ where: { key } });
  const remote = await validateWithLicensePanel(key, host);

  // If this website does not hold the license locally, ask the remote panel
  // and create a local shadow record so the session can be validated later.
  if (!license) {
    if (!remote) {
      return { error: "Cannot reach the license panel. Check LICENSE_PANEL_URL and LICENSE_API_TOKEN on this server." };
    }
    if (!remote.valid) {
      return { error: remote.reason || "Invalid license key" };
    }
    const domains = remote.allowedDomains || host;
    if (!domainAllowed(domains, host)) {
      return { error: `This license is not valid for ${host}` };
    }
    license = await prisma.license.create({
      data: {
        key,
        label: "Remote license",
        allowedDomains: domains,
        active: true,
        expiresAt: remote.expiresAt ? new Date(remote.expiresAt) : null,
        activatedAt: new Date(),
        lastDomain: host,
      },
    });
  } else {
    if (!license.active) return { error: "Invalid or disabled license key" };
    if (!domainAllowed(license.allowedDomains, host)) {
      return { error: `This license is not valid for ${host}` };
    }
    // A temporary 502/unreachable panel is ignored; an authoritative rejection
    // from the panel still blocks activation.
    if (remote && remote.valid === false) {
      return { error: remote.reason || "License validation failed" };
    }
    await prisma.license.update({
      where: { id: license.id },
      data: { activatedAt: new Date(), lastDomain: host },
    });
  }

  // One activation unlocks the whole installation for every visitor.
  await prisma.installationLicense.upsert({
    where: { id: "main" },
    update: {
      licenseKey: key,
      licenseId: license.id,
      domain: host,
      active: true,
      activatedAt: new Date(),
      expiresAt: license.expiresAt,
    },
    create: {
      id: "main",
      licenseKey: key,
      licenseId: license.id,
      domain: host,
      active: true,
      activatedAt: new Date(),
      expiresAt: license.expiresAt,
    },
  });
  redirect("/");
}

async function requireLicenseAdmin() {
  if (!isLicensePanelAuthenticated()) redirect("/license");
}

export async function createLicenseAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireLicenseAdmin();
  const label = String(formData.get("label") || "Client license").trim().slice(0, 80) || "Client license";
  const domains = String(formData.get("allowedDomains") || "localhost,127.0.0.1").trim();
  if (!domains) return { error: "Enter at least one allowed domain" };
  let key = newLicenseKey();
  while (await prisma.license.findUnique({ where: { key } })) key = newLicenseKey();
  await prisma.license.create({ data: { key, label, allowedDomains: domains, active: true } });
  revalidatePath("/license");
  return { ok: true };
}

export async function toggleLicenseAction(formData: FormData) {
  await requireLicenseAdmin();
  const id = String(formData.get("id") || "");
  const license = await prisma.license.findUnique({ where: { id } });
  if (license) await prisma.license.update({ where: { id }, data: { active: !license.active } });
  revalidatePath("/license");
}

export async function deleteLicenseAction(formData: FormData) {
  await requireLicenseAdmin();
  const id = String(formData.get("id") || "");
  await prisma.license.deleteMany({ where: { id } });
  revalidatePath("/license");
}
