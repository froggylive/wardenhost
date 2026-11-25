"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { couponSchema } from "@/lib/validation";

function parse(formData: FormData) {
  const maxUsesRaw = String(formData.get("maxUses") || "");
  return couponSchema.safeParse({
    code: String(formData.get("code") || "").toUpperCase(),
    type: String(formData.get("type") || "PERCENT"),
    value: String(formData.get("value") || 0),
    maxUses: maxUsesRaw === "" ? null : maxUsesRaw,
    minAmountCents: String(formData.get("minAmount") || 0),
    expiresAt: String(formData.get("expiresAt") || ""),
    active: formData.get("active") === "on",
    appliesTo: String(formData.get("appliesTo") || "ALL"),
    categoryIds: formData.getAll("categoryIds").map(String),
    planIds: formData.getAll("planIds").map(String),
  });
}

async function writeRelations(id: string, appliesTo: string, categoryIds: string[], planIds: string[]) {
  await prisma.couponCategory.deleteMany({ where: { couponId: id } });
  await prisma.couponPlan.deleteMany({ where: { couponId: id } });
  if (appliesTo === "CATEGORIES" && categoryIds.length)
    await prisma.couponCategory.createMany({ data: categoryIds.map((categoryId) => ({ couponId: id, categoryId })) });
  if (appliesTo === "PLANS" && planIds.length)
    await prisma.couponPlan.createMany({ data: planIds.map((planId) => ({ couponId: id, planId })) });
}

export async function createCouponAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await prisma.coupon.findUnique({ where: { code: parsed.data.code } })) return { error: "Coupon code already exists" };
  const { categoryIds, planIds, expiresAt, minAmountCents, maxUses, ...rest } = parsed.data;
  const coupon = await prisma.coupon.create({
    data: { ...rest, maxUses: maxUses === "" || maxUses === undefined ? null : maxUses, minAmountCents: Math.round(minAmountCents * 100), expiresAt: expiresAt ? new Date(expiresAt) : null },
  });
  await writeRelations(coupon.id, coupon.appliesTo, categoryIds || [], planIds || []);
  await audit(admin.id, "CREATE", "Coupon", coupon.id, coupon.code);
  return { ok: true };
}

export async function updateCouponAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { categoryIds, planIds, expiresAt, minAmountCents, maxUses, ...rest } = parsed.data;
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return { error: "Coupon not found" };
  const duplicate = await prisma.coupon.findUnique({ where: { code: rest.code } });
  if (duplicate && duplicate.id !== id) return { error: "Coupon code already exists" };
  await prisma.coupon.update({
    where: { id },
    data: { ...rest, maxUses: maxUses === "" || maxUses === undefined ? null : maxUses, minAmountCents: Math.round(minAmountCents * 100), expiresAt: expiresAt ? new Date(expiresAt) : null },
  });
  await writeRelations(id, rest.appliesTo, categoryIds || [], planIds || []);
  await audit(admin.id, "UPDATE", "Coupon", id, rest.code);
  return { ok: true };
}

export async function toggleCouponAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return { error: "Coupon not found" };
  await prisma.coupon.update({ where: { id }, data: { active: !coupon.active } });
  await audit(admin.id, "TOGGLE", "Coupon", id, `Active: ${!coupon.active}`);
  return { ok: true };
}

export async function deleteCouponAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  await prisma.coupon.delete({ where: { id } });
  await audit(admin.id, "DELETE", "Coupon", id);
  return { ok: true };
}
