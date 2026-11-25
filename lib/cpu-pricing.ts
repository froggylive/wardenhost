import { prisma } from "@/lib/prisma";

/** Returns the CPU price for a category, falling back to the global CPU price. */
export async function getCpuPriceForCategory(cpuOptionId: string, categoryId: string) {
  const cpu = await prisma.cpuOption.findUnique({ where: { id: cpuOptionId } });
  if (!cpu) return 0;
  const override = await prisma.cpuCategoryPrice.findUnique({
    where: { cpuOptionId_categoryId: { cpuOptionId, categoryId } },
  });
  return override ? override.priceCents : cpu.priceCents;
}

export async function getCpuOptionsForCategory(categoryId: string) {
  const cpus = await prisma.cpuOption.findMany({
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }],
    select: { id: true, name: true, priceCents: true },
  });
  const overrides = await prisma.cpuCategoryPrice.findMany({ where: { categoryId } });
  const map = new Map(overrides.map((o) => [o.cpuOptionId, o.priceCents]));
  return cpus.map((c) => ({ ...c, priceCents: map.has(c.id) ? map.get(c.id)! : c.priceCents }));
}
