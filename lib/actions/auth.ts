"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, checkLoginRateLimit, recordLoginAttempt, clearLoginAttempts, clientIp } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { getSetting } from "@/lib/settings";
import { loginSchema, registerSchema, profileSchema } from "@/lib/validation";
import { sendMail, verificationEmail, resetEmail } from "@/lib/mail";

type Result = { error?: string; success?: boolean; message?: string; devLink?: string };

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function loginAction(formData: FormData): Promise<Result> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });
  if (!parsed.success) return { error: "Enter a valid email and password" };

  const { email, password } = parsed.data;
  const headers = new Headers();
  // Rate limit key uses email only; request headers are unavailable in actions,
  // so an additional per-IP limiter is applied in the route-level API login.
  const key = `login:${email.toLowerCase()}`;
  if (!(await checkLoginRateLimit(key))) return { error: "Too many attempts. Please try again in 15 minutes." };

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    await recordLoginAttempt(key);
    return { error: "Invalid email or password" };
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await recordLoginAttempt(key);
    return { error: "Invalid email or password" };
  }
  await clearLoginAttempts(key);
  await createSession(user.id, formData.get("remember") === "on");
  const next = String(formData.get("next") || "");
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  redirect(user.role === "ADMIN" ? "/admin" : "/client");
}

export async function registerAction(formData: FormData): Promise<Result> {
  if (!(await getSetting("allowRegistration", true))) {
    return { error: "Registration is currently disabled." };
  }
  const parsed = registerSchema.safeParse({
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    confirmPassword: String(formData.get("confirmPassword") || ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "An account with this email already exists" };
  }

  const requireVerification = await getSetting("requireEmailVerification", false);
  const token = requireVerification ? randomToken(24) : null;
  const hash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: hash,
      role: "CUSTOMER",
      emailVerified: !requireVerification,
      verificationToken: token,
    },
  });

  let devLink: string | undefined;
  if (token) {
    const link = `${baseUrl()}/verify-email?token=${token}`;
    const mail = await verificationEmail(link);
    const sent = await sendMail(email, "Verify your WardenHost account", mail.text, mail.html);
    if (!sent.delivered) devLink = link;
    return { success: true, message: "Account created. Please verify your email address.", devLink };
  }

  await createSession((await prisma.user.findUnique({ where: { email } }))!.id);
  redirect("/client");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function verifyEmailAction(token: string) {
  const user = await prisma.user.findUnique({ where: { verificationToken: token } });
  if (!user) redirect("/verify-email?status=invalid");
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null },
  });
  await createSession(user.id);
  redirect("/client?verified=1");
}

export async function forgotPasswordAction(formData: FormData): Promise<Result> {
  const email = String(formData.get("email") || "").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: true, message: "If an account exists, a reset link has been sent." };
  const token = randomToken(24);
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) },
  });
  const link = `${baseUrl()}/reset-password?token=${token}`;
  const mail = await resetEmail(link);
  const sent = await sendMail(email, "Reset your WardenHost password", mail.text, mail.html);
  return { success: true, message: "If an account exists, a reset link has been sent.", devLink: sent.delivered ? undefined : link };
}

export async function resetPasswordAction(formData: FormData): Promise<Result> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirmPassword") || "");
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== confirm) return { error: "Passwords do not match" };
  const user = await prisma.user.findUnique({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return { error: "This reset link is invalid or has expired" };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10), resetToken: null, resetTokenExpires: null },
  });
  redirect("/login?reset=1");
}

export async function updateProfileAction(formData: FormData): Promise<Result> {
  const { getAuthUser } = await import("@/lib/auth");
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };
  const parsed = profileSchema.safeParse({
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    company: String(formData.get("company") || ""),
    address: String(formData.get("address") || ""),
    city: String(formData.get("city") || ""),
    country: String(formData.get("country") || ""),
    postalCode: String(formData.get("postalCode") || ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  return { success: true, message: "Profile updated" };
}

export async function changePasswordAction(formData: FormData): Promise<Result> {
  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const { getAuthUser } = await import("@/lib/auth");
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !(await bcrypt.compare(current, dbUser.passwordHash))) return { error: "Current password is incorrect" };
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { success: true, message: "Password updated" };
}
