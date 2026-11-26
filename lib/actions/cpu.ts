"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function saveCpuOptionAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price") || 0);
  if (name.length < 2) return { error: "CPU name is required" };
  if (!Number.isFinite(price) || price < 0) return { error: "Invalid price" };

  const data = {
    name,
    priceCents: Math.round(price * 100),
    active: formData.get("active") === "on",
    inStock: formData.get("inStock") === "on",
    displayOrder: Number(formData.get("displayOrder") || 0),
  };

  if (id) {
    await prisma.cpuOption.update({ where: { id }, data });
    await audit(admin.id, "UPDATE", "CpuOption", id, `${name} · ₹${price}`);
  } else {
    const exists = await prisma.cpuOption.findUnique({ where: { name } });
    if (exists) return { error: "A CPU option with this name already exists" };
    const created = await prisma.cpuOption.create({ data });
    await audit(admin.id, "CREATE", "CpuOption", created.id, `${name} · ₹${price}`);
  }
  revalidatePath("/admin/cpu");
  revalidatePath("/order");
  return { ok: true };
}

export async function saveCpuCategoryPricesAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^price_([^_]+)_(.+)$/);
    if (!match) continue;
    const [, cpuId, categoryId] = match;
    const cents = Math.round(Number(value) * 100);
    if (!Number.isFinite(cents) || cents < 0) continue;
    await prisma.cpuCategoryPrice.upsert({
      where: { cpuOptionId_categoryId: { cpuOptionId: cpuId, categoryId } },
      update: { priceCents: cents },
      create: { cpuOptionId: cpuId, categoryId, priceCents: cents },
    });
  }
  await audit(admin.id, "UPDATE", "CpuCategoryPrices", undefined, "Category CPU pricing updated");
  revalidatePath("/admin/cpu");
  revalidatePath("/plans");
  revalidatePath("/order");
  return { ok: true };
}

export async function toggleCpuOptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const cpu = await prisma.cpuOption.findUnique({ where: { id } });
  if (!cpu) return { error: "CPU option not found" };
  await prisma.cpuOption.update({ where: { id }, data: { active: !cpu.active } });
  await audit(admin.id, "TOGGLE", "CpuOption", id, `Active: ${!cpu.active}`);
  revalidatePath("/admin/cpu");
  revalidatePath("/order");
  return { ok: true };
}

export async function toggleCpuStockAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const cpu = await prisma.cpuOption.findUnique({ where: { id } });
  if (!cpu) return { error: "CPU option not found" };
  await prisma.cpuOption.update({ where: { id }, data: { inStock: !cpu.inStock } });
  await audit(admin.id, "TOGGLE", "CpuOption", id, `In stock: ${!cpu.inStock}`);
  revalidatePath("/admin/cpu");
  revalidatePath("/plans");
  revalidatePath("/order");
  return { ok: true };
}

export async function deleteCpuOptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  await prisma.cpuOption.delete({ where: { id } });
  await audit(admin.id, "DELETE", "CpuOption", id);
  revalidatePath("/admin/cpu");
  revalidatePath("/order");
  return { ok: true };
}
