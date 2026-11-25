import { prisma } from "@/lib/prisma";
import { getCredential } from "@/lib/gateway-credentials";

/**
 * Optional provisioning hook. When a panel URL + API key are configured, a
 * verified payment sends the service details to your panel so a VPS or
 * Minecraft server can be created. Without configuration nothing is called —
 * no fake provisioning is performed.
 */
export async function provisionService(serviceId: string) {
  const [panelUrl, apiKey] = await Promise.all([
    getCredential("PANEL_API_URL"),
    getCredential("PANEL_API_KEY"),
  ]);
  if (!panelUrl || !apiKey) return { skipped: true as const };

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { skipped: true as const };

  const res = await fetch(panelUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      service_id: service.id,
      order_id: service.orderId,
      user_id: service.userId,
      plan: service.planName,
      name: service.name,
      ram: service.ram,
      cpu: service.cpu,
      disk: service.disk,
      expires_at: service.expiresAt,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  const body = await res.text().catch(() => "");
  return { skipped: false as const, ok: res.ok, status: res.status, body: body.slice(0, 500) };
}
