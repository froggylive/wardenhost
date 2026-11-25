import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashToken, randomToken } from "@/lib/crypto";

export const SESSION_COOKIE = "warden_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const SESSION_REMEMBER_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function secureCookies() {
  return (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://");
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    emailVerified: session.user.emailVerified,
  };
}

export async function createSession(userId: string, remember = false) {
  const token = randomToken();
  const maxAge = remember ? SESSION_REMEMBER_MAX_AGE : SESSION_MAX_AGE;
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + maxAge * 1000),
    },
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return token;
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookies().delete(SESSION_COOKIE);
}

export async function requireUser() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/client");
  return user;
}

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

/** Basic login rate limiting: max attempts per email+IP within 15 minutes. */
export async function checkLoginRateLimit(key: string, max = 8, windowMs = 15 * 60 * 1000) {
  const since = new Date(Date.now() - windowMs);
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: since } } });
  const count = await prisma.loginAttempt.count({ where: { key, createdAt: { gte: since } } });
  return count < max;
}

export async function recordLoginAttempt(key: string) {
  await prisma.loginAttempt.create({ data: { key } });
}

export async function clearLoginAttempts(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}

export async function audit(
  adminId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string,
  ip?: string
) {
  await prisma.adminActivityLog.create({
    data: { adminId, action, entity, entityId, details, ip },
  });
}
