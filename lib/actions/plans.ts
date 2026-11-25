"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { saveUpload } from "@/lib/upload";

async function uniquePlanSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "plan";
  let i = 1;
  while (true) {
    const found = await prisma.plan.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    slug = `${slugify(base)}-${++i}`;
  }
}

async function parsePlan(formData: FormData) {
  const features = formData.getAll("features").map((v) => String(v).trim()).filter(Boolean);
  const file = formData.get("imageFile");
  let image = String(formData.get("image") || "");
  if (file instanceof File && file.size > 0) {
    const saved = await saveUpload(file, "image");
    if (!saved.ok) throw new Error(saved.error);
    image = saved.url;
  }
  return planSchema.safeParse({
    categoryId: String(formData.get("categoryId") || ""),
    name: String(formData.get("name") || ""),
    ram: String(formData.get("ram") || ""),
    cpu: String(formData.get("cpu") || ""),
    disk: String(formData.get("disk") || ""),
    storageType: String(formData.get("storageType") || ""),
    bandwidth: String(formData.get("bandwidth") || ""),
    networkSpeed: String(formData.get("networkSpeed") || ""),
    ipv4Count: String(formData.get("ipv4Count") || 1),
    price: String(formData.get("price") || 0),
    currency: String(formData.get("currency") || "INR"),
    billingPeriod: String(formData.get("billingPeriod") || "monthly"),
    shortDescription: String(formData.get("shortDescription") || ""),
    fullDescription: String(formData.get("fullDescription") || ""),
    features,
    orderUrl: String(formData.get("orderUrl") || ""),
    image,
    active: formData.get("active") === "on",
    inStock: formData.get("inStock") === "on",
    featured: formData.get("featured") === "on",
    displayOrder: String(formData.get("displayOrder") || 0),
  });
}

function dataFrom(parsed: any, slug: string) {
  const { price, features, ...rest } = parsed;
  return {
    ...rest,
    slug,
    image: rest.image || null,
    orderUrl: rest.orderUrl || null,
    shortDescription: rest.shortDescription || null,
    fullDescription: rest.fullDescription || null,
    priceCents: Math.round(Number(price) * 100),
  };
}

async function refreshPublic() {
  revalidatePath("/");
  revalidatePath("/order");
  revalidatePath("/admin/plans");
}

export async function createPlanAction(formData: FormData, publish = false): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  let parsed;
  try { parsed = await parsePlan(formData); } catch (e: any) { return { error: e.message }; }
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const slug = await uniquePlanSlug(`${parsed.data.name}`);
  const plan = await prisma.plan.create({
    data: {
      ...dataFrom(parsed.data, slug),
      active: publish ? true : parsed.data.active,
      features: { create: parsed.data.features.map((text, i) => ({ text, displayOrder: i })) },
    },
  });
  await audit(admin.id, publish ? "PUBLISH" : "CREATE", "Plan", plan.id, plan.name);
  await refreshPublic();
  return { ok: true };
}

export async function updatePlanAction(formData: FormData, publish = false): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) return { error: "Plan not found" };
  let parsed;
  try { parsed = await parsePlan(formData); } catch (e: any) { return { error: e.message }; }
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const slug = existing.name === parsed.data.name ? existing.slug : await uniquePlanSlug(parsed.data.name, id);
  await prisma.plan.update({ where: { id }, data: dataFrom(parsed.data, slug) });
  await prisma.planFeature.deleteMany({ where: { planId: id } });
  await prisma.planFeature.createMany({
    data: parsed.data.features.map((text, i) => ({ planId: id, text, displayOrder: i })),
  });
  await audit(admin.id, publish ? "PUBLISH" : "UPDATE", "Plan", id, parsed.data.name);
  await refreshPublic();
  revalidatePath(`/hosting/${existing.categoryId}`);
  return { ok: true };
}

export async function setPlanActiveAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const active = formData.get("active") === "true";
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return { error: "Plan not found" };
  await prisma.plan.update({ where: { id }, data: { active } });
  await audit(admin.id, "TOGGLE", "Plan", id, `Active: ${active}`);
  await refreshPublic();
  return { ok: true };
}

export async function duplicatePlanAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const plan = await prisma.plan.findUnique({ where: { id }, include: { features: true } });
  if (!plan) return { error: "Plan not found" };
  const slug = await uniquePlanSlug(`${plan.name} copy`);
  const copy = await prisma.plan.create({
    data: {
      categoryId: plan.categoryId,
      name: `${plan.name} (Copy)`,
      slug,
      ram: plan.ram, cpu: plan.cpu, disk: plan.disk, storageType: plan.storageType,
      bandwidth: plan.bandwidth, networkSpeed: plan.networkSpeed, ipv4Count: plan.ipv4Count,
      priceCents: plan.priceCents, currency: plan.currency, billingPeriod: plan.billingPeriod,
      shortDescription: plan.shortDescription, fullDescription: plan.fullDescription,
      orderUrl: plan.orderUrl, image: plan.image, active: false, inStock: false, featured: false,
      displayOrder: plan.displayOrder,
      features: { create: plan.features.map((f) => ({ text: f.text, displayOrder: f.displayOrder })) },
    },
  });
  await audit(admin.id, "DUPLICATE", "Plan", copy.id, `${plan.name} -> ${copy.name}`);
  await refreshPublic();
  return { ok: true };
}

export async function deletePlanAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return { error: "Plan not found" };
  await prisma.plan.delete({ where: { id } });
  await audit(admin.id, "DELETE", "Plan", id, plan.name);
  await refreshPublic();
  return { ok: true };
}
