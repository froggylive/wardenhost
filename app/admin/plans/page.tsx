import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { PlanManager } from "@/components/plan-manager";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const [plans, categories, settings] = await Promise.all([
    prisma.plan.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { category: { select: { name: true } }, features: { orderBy: { displayOrder: "asc" } } },
    }),
    prisma.category.findMany({ orderBy: [{ displayOrder: "asc" }], select: { id: true, name: true } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="Plans" description="Manage every specification, price and feature from one place. Published plans update the website instantly." />
      <PlanManager plans={plans} categories={categories} symbol={settings.currencySymbol || "₹"} />
    </>
  );
}
