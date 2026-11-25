import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { domainsAllow } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Server-to-server validation used by the main website. */
export async function POST(request: Request) {
  const token = request.headers.get("x-license-api-token") || "";
  const expected = process.env.LICENSE_API_TOKEN || "";
  if (!expected || token !== expected) {
    return NextResponse.json({ valid: false, reason: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const key = String(body.key || "").trim().toUpperCase();
  const domain = String(body.domain || "").trim().toLowerCase();
  if (!key || !domain) {
    return NextResponse.json({ valid: false, reason: "missing parameters" }, { status: 400 });
  }

  const license = await prisma.license.findUnique({ where: { key } });
  if (!license || !license.active) {
    return NextResponse.json({ valid: false, reason: "invalid or disabled license" });
  }
  if (!domainsAllow(license.allowedDomains, domain)) {
    return NextResponse.json({ valid: false, reason: "domain not allowed" });
  }
  if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ valid: false, reason: "license expired", expiresAt: license.expiresAt });
  }

  return NextResponse.json({
    valid: true,
    label: license.label,
    expiresAt: license.expiresAt,
    allowedDomains: license.allowedDomains,
  });
}
