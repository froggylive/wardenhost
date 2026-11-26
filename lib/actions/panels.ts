"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testPanel } from "@/lib/provisioning";

export async function savePanelAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  let code = String(formData.get("code") || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const name = String(formData.get("name") || "").trim();
  const apiUrl = String(formData.get("apiUrl") || "").trim();
  const apiKey = String(formData.get("apiKey") || "").trim();
  if (!name || !apiUrl) return { error: "Name and API URL are required" };

  const existing = id ? await prisma.panelConfig.findUnique({ where: { id } }) : null;
  if (!code && !existing) code = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!code) return { error: "Panel code is required" };

  const data = {
    code,
    name,
    apiUrl,
    apiKey: apiKey || existing?.apiKey || "",
    createPath: String(formData.get("createPath") || existing?.createPath || "/api/create").trim(),
    deletePath: String(formData.get("deletePath") || existing?.deletePath || "/api/delete").trim(),
    testPath: String(formData.get("testPath") || existing?.testPath || "/api/health").trim(),
    authHeader: String(formData.get("authHeader") || existing?.authHeader || "Authorization").trim(),
    authScheme: String(formData.get("authScheme") || existing?.authScheme || "Bearer").trim(),
    adminUser: String(formData.get("adminUser") || existing?.adminUser || "").trim() || null,
    adminPassword: String(formData.get("adminPassword") || existing?.adminPassword || "").trim() || null,
    active: formData.get("active") === "on",
    description: String(formData.get("description") || "").trim() || null,
    displayOrder: Number(formData.get("displayOrder") || 0),
  };

  if (existing) {
    await prisma.panelConfig.update({ where: { id: existing.id }, data });
    await audit(admin.id, "UPDATE", "PanelConfig", existing.id, name);
  } else {
    const clash = await prisma.panelConfig.findUnique({ where: { code } });
    if (clash) return { error: "A panel with this code already exists" };
    const created = await prisma.panelConfig.create({ data });
    await audit(admin.id, "CREATE", "PanelConfig", created.id, name);
  }
  revalidatePath("/admin/panels");
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deletePanelAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  await prisma.panelConfig.delete({ where: { id } });
  await audit(admin.id, "DELETE", "PanelConfig", id);
  revalidatePath("/admin/panels");
  revalidatePath("/admin/categories");
}

export async function togglePanelAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const panel = await prisma.panelConfig.findUnique({ where: { id } });
  if (panel) {
    await prisma.panelConfig.update({ where: { id }, data: { active: !panel.active } });
    await audit(admin.id, "TOGGLE", "PanelConfig", id, `Active: ${!panel.active}`);
  }
  revalidatePath("/admin/panels");
}

export async function testPanelAction(formData: FormData): Promise<{ error?: string; ok?: boolean; detail?: string }> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const panel = await prisma.panelConfig.findUnique({ where: { id } });
  if (!panel) return { error: "Panel not found" };
  const result = await testPanel(panel.code);
  return result.ok
    ? { ok: true, detail: `Connected (HTTP ${result.status || 200})` }
    : { error: result.error || `Connection failed (HTTP ${result.status || 0})` };
}
