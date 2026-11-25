"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { saveUpload } from "@/lib/upload";

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "category";
  let i = 1;
  while (true) {
    const found = await prisma.category.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    slug = `${slugify(base)}-${++i}`;
  }
}

async function parse(formData: FormData) {
  let image = String(formData.get("image") || "");
  const file = formData.get("imageFile");
  if (file instanceof File && file.size > 0) {
    const saved = await saveUpload(file, "image");
    if (!saved.ok) throw new Error(saved.error);
    image = saved.url;
  }
  return categorySchema.safeParse({
    name: String(formData.get("name") || ""),
    description: String(formData.get("description") || ""),
    icon: String(formData.get("icon") || "Server"),
    image,
    displayOrder: String(formData.get("displayOrder") || 0),
    active: formData.get("active") === "on",
  });
}

export async function createCategoryAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const parsed = await parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const slug = await uniqueSlug(parsed.data.name);
  const category = await prisma.category.create({
    data: { ...parsed.data, image: parsed.data.image || null, slug },
  });
  await audit(admin.id, "CREATE", "Category", category.id, parsed.data.name);
  revalidatePath("/");
  revalidatePath("/admin/categories");
  revalidatePath("/order");
  return { ok: true };
}

export async function updateCategoryAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = await parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return { error: "Category not found" };
  const slug = existing.name === parsed.data.name ? existing.slug : await uniqueSlug(parsed.data.name, id);
  await prisma.category.update({
    where: { id },
    data: { ...parsed.data, image: parsed.data.image || null, slug },
  });
  await audit(admin.id, "UPDATE", "Category", id, parsed.data.name);
  revalidatePath("/");
  revalidatePath(`/hosting/${existing.slug}`);
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function toggleCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return { error: "Category not found" };
  await prisma.category.update({ where: { id }, data: { active: !category.active } });
  await audit(admin.id, "TOGGLE", "Category", id, `Active: ${!category.active}`);
  revalidatePath("/");
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deleteCategoryAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const force = formData.get("force") === "true";
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { plans: true } } } });
  if (!category) return { error: "Category not found" };
  if (category._count.plans > 0 && !force) {
    return { error: `This category contains ${category._count.plans} plan(s). Confirm that you want to delete them as well.` };
  }
  await prisma.category.delete({ where: { id } });
  await audit(admin.id, "DELETE", "Category", id, `${category.name}${force ? " (with plans)" : ""}`);
  revalidatePath("/");
  revalidatePath("/admin/categories");
  return { ok: true };
}
