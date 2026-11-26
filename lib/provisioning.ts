import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import { prisma } from "@/lib/prisma";

const runCurl = promisify(execFile);

type PanelPayload = Record<string, unknown>;

type PanelAction = "create" | "delete" | "test";

function panelEndpoint(base: string, path: string) {
  if (!path || path === "/") return base;
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function callPanel(panelCode: string, payload: PanelPayload, action: PanelAction = "create") {
  const panel = await prisma.panelConfig.findUnique({ where: { code: panelCode } });
  if (!panel || !panel.active || !panel.apiUrl || !panel.apiKey) {
    return { skipped: true as const, reason: "Panel not configured" };
  }
  const path = action === "delete" ? panel.deletePath : action === "test" ? panel.testPath : panel.createPath;
  try {
    const scheme = panel.authScheme?.trim();
    const authValue = scheme ? `${scheme} ${panel.apiKey}` : panel.apiKey;
    const res = await fetch(panelEndpoint(panel.apiUrl, path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        [panel.authHeader || "Authorization"]: authValue,
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

/** Fallback for panels whose public API is not exposed: use admin session via curl. */
async function adminSession(panel: { code: string; apiUrl: string; adminUser?: string | null; adminPassword?: string | null }) {
  if (!panel.adminUser || !panel.adminPassword) return null;
  const base = panel.apiUrl.replace(/\/$/, "");
  const jar = path.join(os.tmpdir(), `vpanel-${panel.code}-${Date.now()}.jar`);
  try {
    const { stdout } = await runCurl("curl", [
      "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "30",
      "-c", jar, "-b", jar, "-X", "POST",
      "-d", `username=${panel.adminUser}`,
      "--data-urlencode", `password=${panel.adminPassword}`,
      `${base}/login`,
    ], { maxBuffer: 1024 * 1024 });
    if (stdout.trim() !== "302") return null;
    return { base, jar };
  } catch {
    return null;
  }
}

async function createViaAdminPanel(panelCode: string, payload: PanelPayload) {
  const panel = await prisma.panelConfig.findUnique({ where: { code: panelCode } });
  if (!panel) return { skipped: true as const, reason: "Panel not configured" };
  const session = await adminSession(panel);
  if (!session) return { skipped: true as const, reason: "Admin credentials not configured" };

  const fields: Record<string, string> = {
    os: String(payload.os || "Ubuntu 24.04 LTS"),
    name: String(payload.service_id || "vps").slice(0, 40).replace(/[^a-zA-Z0-9-]/g, "-"),
    hostname: String(payload.name || payload.service_id || "vps"),
    username: String(payload.username || "root"),
    password: String(payload.password || "VantaHost@2026"),
    memory: String(payload.memory || "1024"),
    cpus: String(payload.cpus || "1"),
    disk_size: String(payload.disk || "10G").toUpperCase(),
    ssh_port: "",
    port_forwards: "[]",
    start_on_boot: "1",
    gui_mode: "0",
    owner_id: String(payload.owner_id || "1"),
  };
  const args = ["-s", "-b", session.jar, "-X", "POST", "--max-time", "240"];
  for (const [key, value] of Object.entries(fields)) args.push("-F", `${key}=${value}`);
  args.push(`${session.base}/admin/servers/create`);

  try {
    const { stdout } = await runCurl("curl", args, { maxBuffer: 4 * 1024 * 1024 });
    const data: any = JSON.parse(stdout || "{}");
    return { skipped: false as const, ok: !!data?.ok, status: 200, data: { id: data?.vm?.id, vm: data?.vm }, mode: "admin" };
  } catch (error: any) {
    return { skipped: false as const, ok: false, status: 0, data: { error: error?.message || "Creation failed" }, mode: "admin" };
  } finally {
    await import("fs/promises").then((fs) => fs.unlink(session.jar).catch(() => {}));
  }
}

async function deleteViaAdminPanel(panelCode: string, externalId: string | null) {
  const panel = await prisma.panelConfig.findUnique({ where: { code: panelCode } });
  if (!panel || !externalId) return { skipped: true as const, reason: "Panel or external id missing" };
  const session = await adminSession(panel);
  if (!session) return { skipped: true as const, reason: "Admin credentials not configured" };
  try {
    const { stdout } = await runCurl("curl", [
      "-s", "-b", session.jar, "-X", "POST", "--max-time", "60",
      "-H", "Content-Type: application/json", "-d", '{"confirm":true}',
      `${session.base}/admin/servers/${encodeURIComponent(externalId)}/delete`,
    ], { maxBuffer: 1024 * 1024 });
    const data: any = JSON.parse(stdout || "{}");
    return { skipped: false as const, ok: data?.ok !== false, status: 200, data, mode: "admin" };
  } catch (error: any) {
    return { skipped: false as const, ok: false, status: 0, data: { error: error?.message || "Delete failed" }, mode: "admin" };
  } finally {
    await import("fs/promises").then((fs) => fs.unlink(session.jar).catch(() => {}));
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

  let result: any = await callPanel(panelCode, {
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

  if (result.skipped || (!result.ok && [0, 401, 404].includes(result.status))) {
    const memoryMatch = String(service.ram).match(/(\d+)/);
    result = await createViaAdminPanel(panelCode, {
      service_id: service.id,
      name: service.name,
      memory: memoryMatch ? Number(memoryMatch[1]) : 1024,
      cpus: String(service.cpu).match(/(\d+)/)?.[1] || "1",
      disk: String(service.disk).match(/(\d+)\s*(TB|GB)/i)?.slice(1).join("") || "10G",
      username: "root",
    });
  }

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
  const result: any = await callPanel(panelCode, {
    action: "delete",
    service_id: service.id,
    external_id: service.externalId,
    email: service.userId,
  }, "delete");
  if (result.skipped || (!result.ok && [0, 401, 404].includes(result.status))) {
    return deleteViaAdminPanel(panelCode, service.externalId);
  }
  return result;
}

/** Test a panel connection from the admin panel. */
export async function testPanel(code: string) {
  const panel = await prisma.panelConfig.findUnique({ where: { code } });
  if (!panel) return { ok: false, error: "Panel not found" };
  const res: any = await callPanel(code, { action: "test", service_id: "connection-test" }, "test");
  if (!res.skipped && res.ok) return { ok: true, status: res.status, data: res.data };
  const cfg = await prisma.panelConfig.findUnique({ where: { code } });
  if (!cfg) return { ok: false, error: "Panel not found" };
  const session = await adminSession(cfg);
  if (!session) return { ok: false, error: res.reason || "No working auth method" };
  try {
    const { stdout } = await runCurl("curl", ["-s", "-b", session.jar, "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "20", `${session.base}/admin`], { maxBuffer: 1024 * 1024 });
    const status = Number(stdout.trim());
    return { ok: status === 200, status, data: { mode: "admin" } };
  } finally {
    await import("fs/promises").then((fs) => fs.unlink(session.jar).catch(() => {}));
  }
}
