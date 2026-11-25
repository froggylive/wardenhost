import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { CpuManager } from "@/components/cpu-manager";

export const dynamic = "force-dynamic";

export default async function AdminCpuPage() {
  const [cpus, categories, settings] = await Promise.all([
    prisma.cpuOption.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { categoryPrices: true },
    }),
    prisma.category.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="CPU Options" description="Enable processor upgrades, set global prices and override them per hosting category." />
      <CpuManager cpus={cpus} categories={categories} symbol={settings.currencySymbol || "₹"} />
    </>
  );
}
