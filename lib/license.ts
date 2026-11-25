import { cookies, headers } from "next/headers";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const LICENSE_COOKIE = "warden_license";
export const LICENSE_ADMIN_COOKIE = "warden_license_admin";
export const LICENSE_PANEL_PATH = "/license";

export function requestHost() {
  return (headers().get("host") || "").split(":")[0].trim().toLowerCase();
}

export function domainAllowed(domains: string, host: string) {
  return domains
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
    .some((d) => d === host || (d.startsWith("*.") && host.endsWith(d.slice(1))));
}

function envLicenseValid(host: string) {
  if (!process.env.LICENSE_KEY?.trim()) return false;
  const domains = process.env.ALLOWED_DOMAINS || "localhost,127.0.0.1";
  return domainAllowed(domains, host);
}

let lastCleanup = 0;

/** Removes licenses more than 3 days past expiry. */
export async function cleanupExpiredLicenses() {
  if (Date.now() - lastCleanup < 60 * 60 * 1000) return;
  lastCleanup = Date.now();
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  await prisma.license.deleteMany({ where: { expiresAt: { lt: cutoff } } });
}

/** Asks the separate license panel on port 3006 to validate a key. */
export async function validateWithLicensePanel(key: string, host: string) {
  const url = process.env.LICENSE_PANEL_URL;
  const token = process.env.LICENSE_API_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-license-api-token": token },
      body: JSON.stringify({ key, domain: host }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as { valid: boolean; reason?: string; expiresAt?: string | null };
  } catch {
    return null;
  }
}

/** Env license works immediately; otherwise an activated, unexpired DB license is required. */
export async function isLicensedInstallation() {
  await cleanupExpiredLicenses();
  const host = requestHost();
  if (envLicenseValid(host)) return true;

  const licenseId = cookies().get(LICENSE_COOKIE)?.value;
  if (!licenseId) return false;
  const license = await prisma.license.findUnique({ where: { id: licenseId } });
  if (!license || !license.active || !domainAllowed(license.allowedDomains, host)) return false;
  if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) return false;

  // Cross-check with the separate license panel when it is configured.
  const remote = await validateWithLicensePanel(license.key, host);
  if (remote && remote.valid === false) return false;

  return true;
}

function licenseAdminToken() {
  const password = process.env.LICENSE_PANEL_PASSWORD || "FroggyLive";
  return createHash("sha256").update(`license-panel:${password}`).digest("hex");
}

export function isLicensePanelAuthenticated() {
  return cookies().get(LICENSE_ADMIN_COOKIE)?.value === licenseAdminToken();
}

export function setLicenseAdminCookie() {
  cookies().set(LICENSE_ADMIN_COOKIE, licenseAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
    secure: (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://"),
  });
}

export function clearLicenseAdminCookie() {
  cookies().delete(LICENSE_ADMIN_COOKIE);
}
