import { prisma } from "@/lib/prisma";

type PanelPayload = Record<string, unknown>;

async function callPanel(panelCode: string, payload: PanelPayload) {
  const panel = await prisma.panelConfig.findUnique({ where: { code: panelCode } });
  if (!panel || !panel.active || !panel.apiUrl || !panel.apiKey) {
    return { skipped: true as const, reason: "Panel not configured" };
  }
  try {
    const res = await fetch(panel.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${panel.apiKey}`,
        "X-Api-Key": panel.apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const text = await res.text().catch(() => "");
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 300) }; }
    return { skipped: false as const, ok: res.ok, status: res.status, data };
  } catch (error: any) {
    return { skipped: false as const, ok: false, status: 0, data: { error: error?.message || "Request failed" } };
  }
}

function externalId(data: any) {
  return String(
    data?.id || data?.server_id || data?.serverId || data?.vmid || data?.data?.id || data?.data?.server_id || ""
  ) || null;
}

/** Creates a VPS/Minecraft instance after verified payment when a panel is configured. */
export async function provisionService(serviceId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { user: { select: { name: true, email: true } }, plan: { include: { category: true } } },
  });
  if (!service) return { skipped: true as const, reason: "Service not found" };
  const panelCode = service.plan?.category?.panelCode || service.panelCode;
  if (!panelCode) return { skipped: true as const, reason: "No panel mapped to this category" };

  const result = await callPanel(panelCode, {
    action: "create",
    service_id: service.id,
    order_id: service.orderId,
    customer: { name: service.user.name, email: service.user.email },
    plan: service.planName,
    name: service.name,
    ram: service.ram,
    cpu: service.cpu,
    disk: service.disk,
    category: service.plan?.category?.name,
    expires_at: service.expiresAt,
  });

  if (!result.skipped && result.ok) {
    await prisma.service.update({
      where: { id: service.id },
      data: { panelCode, externalId: externalId(result.data) || service.externalId },
    });
  }
  return result;
}

/** Removes an instance when a service is deleted or expired unpaid. */
export async function deprovisionService(serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { skipped: true as const, reason: "Service not found" };
  const panelCode = service.panelCode;
  if (!panelCode) return { skipped: true as const, reason: "No panel mapped" };
  return callPanel(panelCode, {
    action: "delete",
    service_id: service.id,
    external_id: service.externalId,
    email: service.userId,
  });
}

/** Test a panel connection from the admin panel. */
export async function testPanel(code: string) {
  const panel = await prisma.panelConfig.findUnique({ where: { code } });
  if (!panel) return { ok: false, error: "Panel not found" };
  const res = await callPanel(code, { action: "test", service_id: "connection-test" });
  return res.skipped ? { ok: false, error: res.reason } : { ok: res.ok, status: res.status, data: res.data };
}
