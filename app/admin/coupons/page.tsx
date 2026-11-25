import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { CouponManager } from "@/components/coupon-manager";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const [coupons, categories, plans] = await Promise.all([
    prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { categories: true, plans: true },
    }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { displayOrder: "asc" } }),
    prisma.plan.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Coupons" description="Create discounts and restrict them to categories or plans. Coupons are validated server-side at checkout." />
      <CouponManager coupons={coupons} categories={categories} plans={plans} />
    </>
  );
}
