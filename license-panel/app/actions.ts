"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearAuthCookie, isAuthed, randomKey, setAuthCookie } from "@/lib/auth";

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") || "");
  if (password !== (process.env.LICENSE_PANEL_PASSWORD || "FroggyLive")) {
    return { error: "Incorrect password" };
  }
  setAuthCookie();
  redirect("/");
}

export async function logoutAction() {
  clearAuthCookie();
  redirect("/");
}

async function requireAuth() {
  if (!isAuthed()) redirect("/");
}

export async function createLicenseAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAuth();
  const label = String(formData.get("label") || "Client license").trim() || "Client license";
  const domains = String(formData.get("domains") || "").trim();
  if (!domains) return { error: "Enter allowed domains" };
  const durationDays = Number(formData.get("durationDays") || 30);
  const expiresAt = Number.isFinite(durationDays) && durationDays > 0
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
    : null;
  let key = randomKey();
  while (await prisma.license.findUnique({ where: { key } })) key = randomKey();
  await prisma.license.create({ data: { key, label, allowedDomains: domains, active: true, expiresAt } });
  revalidatePath("/");
  return { ok: true };
}

export async function toggleLicenseAction(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") || "");
  const license = await prisma.license.findUnique({ where: { id } });
  if (license) await prisma.license.update({ where: { id }, data: { active: !license.active } });
  revalidatePath("/");
}

export async function deleteLicenseAction(formData: FormData) {
  await requireAuth();
  await prisma.license.deleteMany({ where: { id: String(formData.get("id") || "") } });
  revalidatePath("/");
}
