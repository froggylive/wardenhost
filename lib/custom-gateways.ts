import { prisma } from "@/lib/prisma";
import { getSetting, setSetting } from "@/lib/settings";
import { getCredential } from "@/lib/gateway-credentials";
import { slugify } from "@/lib/utils";

export type CustomGatewayKind = "link" | "qr" | "manual";

export type CustomGatewayConfig = {
  code: string;
  name: string;
  description: string;
  kind: CustomGatewayKind;
  apiUrl: string;
  instructions: string;
};

const settingKey = (code: string) => `custom_gateway_${code}`;
const credentialKey = (code: string) => `CUSTOM_${code.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`;

export async function getCustomGatewayConfig(code: string): Promise<CustomGatewayConfig | null> {
  if (!code.startsWith("custom_")) return null;
  const raw = await getSetting<any>(settingKey(code), null);
  if (!raw || typeof raw !== "object") return null;
  return raw as CustomGatewayConfig;
}

export async function getCustomGatewayApiKey(code: string) {
  return getCredential(credentialKey(code));
}

export async function listCustomGateways(): Promise<Array<CustomGatewayConfig & { enabled: boolean }>> {
  const methods = await prisma.paymentMethod.findMany({
    where: { code: { startsWith: "custom_" } },
    orderBy: { displayOrder: "asc" },
  });
  const result: Array<CustomGatewayConfig & { enabled: boolean }> = [];
  for (const m of methods) {
    const config = await getCustomGatewayConfig(m.code);
    if (config) result.push({ ...config, enabled: m.enabled });
  }
  return result;
}

export async function saveCustomGateway(input: {
  id?: string;
  name: string;
  description: string;
  kind: CustomGatewayKind;
  apiUrl: string;
  apiKey?: string;
  instructions: string;
}) {
  const base = `custom_${slugify(input.name) || "gateway"}`;
  let code = base;
  let i = 1;
  while (true) {
    const existing = await prisma.paymentMethod.findUnique({ where: { code } });
    if (!existing || existing.id === input.id) break;
    code = `${base}-${++i}`;
  }

  const existing = input.id ? await prisma.paymentMethod.findUnique({ where: { id: input.id } }) : null;
  const finalCode = existing?.code || code;
  const displayDescription = input.kind === "manual" && input.instructions
    ? input.instructions
    : input.description;
  const config: CustomGatewayConfig = {
    code: finalCode,
    name: input.name,
    description: input.description,
    kind: input.kind,
    apiUrl: input.apiUrl,
    instructions: input.instructions,
  };

  if (existing) {
    await prisma.paymentMethod.update({
      where: { id: existing.id },
      data: { name: input.name, description: displayDescription || null, enabled: true },
    });
  } else {
    const count = await prisma.paymentMethod.count();
    await prisma.paymentMethod.create({
      data: {
        code: finalCode,
        name: input.name,
        description: displayDescription || null,
        enabled: true,
        displayOrder: count + 10,
      },
    });
  }

  await setSetting(settingKey(finalCode), config);
  if (input.apiKey?.trim()) {
    const { setCredential } = await import("@/lib/gateway-credentials");
    await setCredential(credentialKey(finalCode), input.apiKey);
  }
  return config;
}

export async function deleteCustomGateway(code: string) {
  await prisma.paymentMethod.deleteMany({ where: { code } });
  const { clearGatewayCredential } = await import("@/lib/gateway-credentials");
  await clearGatewayCredential(credentialKey(code));
  await prisma.websiteSetting.deleteMany({ where: { key: settingKey(code) } });
}

export async function toggleCustomGateway(code: string, enabled: boolean) {
  await prisma.paymentMethod.updateMany({ where: { code }, data: { enabled } });
}
