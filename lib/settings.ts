import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/utils";

const DEFAULTS: Record<string, unknown> = {
  siteTitle: "WardenHost",
  companyName: "WardenHost",
  heroHeadline: "Infrastructure\nBuilt to Perform.",
  heroDescription: "Reliable hosting for projects that need performance.",
  currency: "INR",
  currencySymbol: "₹",
  invoicePrefix: "INV",
  orderPrefix: "ORD",
  allowRegistration: true,
  requireEmailVerification: false,
  maintenanceMode: false,
  orderTax: 2,
  fampayUpiId: "",
  fampayMerchantName: "WardenHost",
  testNodes: [],
};

export async function getSettings(): Promise<Record<string, any>> {
  const rows = await prisma.websiteSetting.findMany();
  const result: Record<string, unknown> = { ...DEFAULTS };
  for (const row of rows) result[row.key] = parseJson(row.value, null) ?? row.value;
  return result;
}

export async function getSetting<T = any>(key: string, fallback?: T): Promise<T> {
  const row = await prisma.websiteSetting.findUnique({ where: { key } });
  if (!row) return (DEFAULTS[key] ?? fallback) as T;
  return parseJson(row.value, fallback ?? DEFAULTS[key]) as T;
}

export async function setSetting(key: string, value: unknown) {
  await prisma.websiteSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  });
}
