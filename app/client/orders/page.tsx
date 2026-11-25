import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUser();
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="My Orders" description="All orders placed on your account." />
      {orders.length ? (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Order ID</th><th>Plan</th><th>Amount</th><th>Cycle</th><th>Status</th><th>Payment</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="font-mono text-xs text-neutral-400">{o.orderNumber}</td>
                    <td className="font-medium text-white">{o.planName}</td>
                    <td>{formatMoney(o.amountCents, o.currency, settings.currencySymbol || "₹")}</td>
                    <td className="text-xs">{o.billingLabel}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td><StatusBadge status={o.paymentStatus} /></td>
                    <td className="text-xs">{formatDate(o.createdAt)}</td>
                    <td><Link href={`/client/orders/${o.id}`} className="btn-ghost px-2"><ArrowUpRight size={15} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <EmptyState title="No orders yet" description="Placed orders will appear here." action={<Link href="/order" className="btn-primary">Browse plans</Link>} />}
    </>
  );
}
