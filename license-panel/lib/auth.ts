import { cookies } from "next/headers";
import { createHash } from "crypto";

export const COOKIE = "wh_license_admin";

function token() {
  const password = process.env.LICENSE_PANEL_PASSWORD || "FroggyLive";
  return createHash("sha256").update(`license-panel:${password}`).digest("hex");
}

export function isAuthed() {
  return cookies().get(COOKIE)?.value === token();
}

export function setAuthCookie() {
  cookies().set(COOKIE, token(), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
}

export function clearAuthCookie() {
  cookies().delete(COOKIE);
}

export function randomKey() {
  const part = createHash("sha256")
    .update(`${Date.now()}-${Math.random()}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `WARDEN-${part.slice(0, 4)}-${part.slice(4, 8)}-${part.slice(8)}`;
}

export function domainsAllow(domains: string, host: string) {
  return domains.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean).includes(host);
}
