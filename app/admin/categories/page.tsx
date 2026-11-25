import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { CategoryManager } from "@/components/category-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const [categories, panels] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { plans: true } } },
    }),
    prisma.panelConfig.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" }, select: { code: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader title="Categories" description="Create and organize hosting categories. Changes appear on the public website immediately." />
      <CategoryManager categories={categories} panels={panels} />
    </>
  );
}
