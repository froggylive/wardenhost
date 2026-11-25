import nodemailer from "nodemailer";
import { getCredential } from "@/lib/gateway-credentials";
import { getSettings } from "@/lib/settings";

export type MailResult = { delivered: boolean; error?: string };

export async function getSmtpConfig() {
  const [host, port, user, password, from] = await Promise.all([
    getCredential("SMTP_HOST"),
    getCredential("SMTP_PORT"),
    getCredential("SMTP_USER"),
    getCredential("SMTP_PASSWORD"),
    getCredential("SMTP_FROM"),
  ]);
  if (!host || !user || !password) return null;
  const portNumber = Number(port || 587);
  return {
    host,
    port: portNumber,
    secure: portNumber === 465,
    requireTLS: portNumber === 587,
    auth: { user, pass: password },
    from: from || user,
  };
}

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<MailResult> {
  const config = await getSmtpConfig();
  if (!config) {
    console.info(`\n[MAIL -> ${to}] ${subject}\n${text}\n`);
    return { delivered: false, error: "SMTP is not fully configured" };
  }
  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTLS,
      auth: config.auth,
      connectionTimeout: 15000,
    });
    await transport.sendMail({ from: config.from, to, subject, text, html: html || `<pre>${escapeHtml(text)}</pre>` });
    return { delivered: true };
  } catch (error: any) {
    console.error("[MAIL ERROR]", error?.message || error);
    return { delivered: false, error: error?.message || "Mail delivery failed" };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

async function emailShell(title: string, message: string, link: string, cta: string) {
  const settings = await getSettings();
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");
  const logo = String(settings.logo || "/images/warden-logo.webp");
  const banner = "/images/email-banner.webp";
  const company = String(settings.companyName || "WardenHost");
  const credit = String(settings.creditName || "FroggyLive");
  const creditUrl = String(settings.creditUrl || "https://discord.com/users/1558672886020046953");
  const logoUrl = logo.startsWith("http") ? logo : `${base}${logo}`;
  const bannerUrl = `${base}${banner}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:Inter,Arial,sans-serif;color:#ededed">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0a0a;border:1px solid #262626;border-radius:16px;overflow:hidden">
        <tr><td style="padding:24px 32px 18px">
          <img src="${logoUrl}" alt="${escapeHtml(company)}" width="56" height="56" style="width:56px;height:56px;border-radius:12px;display:block">
        </td></tr>
        <tr><td><img src="${bannerUrl}" alt="${escapeHtml(company)}" width="600" style="width:100%;height:auto;display:block"></td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:600;letter-spacing:-0.02em;color:#ffffff">${escapeHtml(title)}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#a3a3a3">${escapeHtml(message)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#ffffff">
            <a href="${link}" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:600;color:#050505;text-decoration:none">${escapeHtml(cta)}</a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#525252">If the button does not work, copy this link into your browser:<br><a href="${link}" style="color:#a3a3a3;word-break:break-all">${escapeHtml(link)}</a></p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #262626;font-size:11px;color:#525252">
          © ${new Date().getFullYear()} ${escapeHtml(company)}. All rights reserved.<br>
          Made By <a href="${escapeHtml(creditUrl)}" style="color:#a3a3a3">${escapeHtml(credit)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return html;
}

export async function verificationEmail(link: string) {
  const text = `Verify your email address:\n\n${link}\n\nIf you did not create an account, ignore this message.`;
  const html = await emailShell("Verify your email", "Confirm your address to activate your WardenHost account and access the client area.", link, "Verify email");
  return { text, html };
}

export async function resetEmail(link: string) {
  const text = `Reset your password:\n\n${link}\n\nThis link expires in 60 minutes. If you did not request it, ignore this message.`;
  const html = await emailShell("Reset your password", "We received a request to reset your password. This link expires in 60 minutes.", link, "Reset password");
  return { text, html };
}

export async function serviceExpiredEmail(serviceName: string, link: string) {
  const text = `Your ${serviceName} service has expired. Renew within 3 days to keep it active.\n\n${link}`;
  const html = await emailShell("Service expired", `Your ${serviceName} service has expired. Renew within 3 days or the instance will be deleted automatically.`, link, "Renew now");
  return { text, html };
}

export async function serviceDeletedEmail(serviceName: string, link: string) {
  const text = `Your unpaid ${serviceName} service was deleted after its 3-day grace period.\n\n${link}`;
  const html = await emailShell("Service deleted", `Your ${serviceName} service was not renewed in time and its instance has been removed. You can place a new order from your client area.`, link, "View client area");
  return { text, html };
}
