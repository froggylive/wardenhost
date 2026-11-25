import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const to = String(body.to || "").trim() || admin.email;
  const settings = await getSettings();

  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const logo = String(settings.logo || "/images/warden-logo.webp");
  const logoUrl = logo.startsWith("http") ? logo : `${base}${logo}`;
  const bannerUrl = `${base}/images/email-banner.webp`;

  const html = `<!doctype html><html><body style="margin:0;background:#050505;font-family:Inter,Arial,sans-serif;color:#ededed">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0a0a;border:1px solid #262626;border-radius:16px;overflow:hidden">
      <tr><td style="padding:24px 32px"><img src="${logoUrl}" alt="WardenHost" width="56" height="56" style="width:56px;height:56px;display:block;border-radius:12px"></td></tr>
      <tr><td><img src="${bannerUrl}" alt="WardenHost" width="600" style="width:100%;height:auto;display:block"></td></tr>
      <tr><td style="padding:32px"><h1 style="margin:0 0 12px;font-size:24px;color:#fff">Email delivery works</h1><p style="margin:0;color:#a3a3a3;line-height:1.6;font-size:14px">This is a test message from ${String(settings.companyName || "WardenHost")}. Verification and password-reset emails will use this design.</p></td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #262626;font-size:11px;color:#525252">Made By ${String(settings.creditName || "FroggyLive")}</td></tr>
    </table>
  </td></tr></table></body></html>`;

  const result = await sendMail(to, "WardenHost — Test email", "Email delivery works. Verification and password-reset emails will use this design.", html);
  if (!result.delivered) {
    return NextResponse.json({ error: result.error || "Unable to send test email" }, { status: 502 });
  }
  return NextResponse.json({ message: `Test email sent to ${to}` });
}
