import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { CategoryManager } from "@/components/category-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { plans: true } } },
  });
  return (
    <>
      <PageHeader title="Categories" description="Create and organize hosting categories. Changes appear on the public website immediately." />
      <CategoryManager categories={categories} />
    </>
  );
}
