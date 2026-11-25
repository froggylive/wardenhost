import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney, statusTone, prettyStatus } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui";
import { ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUSES = ["ALL", "PENDING", "AWAITING_PAYMENT", "PROCESSING", "ACTIVE", "CANCELLED", "FAILED"];

export default async function AdminOrdersPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const status = searchParams.status || "ALL";
  const q = searchParams.q || "";
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...(status !== "ALL" ? { status } : {}),
        ...(q ? { OR: [
          { orderNumber: { contains: q } },
          { planName: { contains: q } },
          { user: { email: { contains: q } } },
          { user: { name: { contains: q } } },
        ] } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
      take: 200,
    }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="Orders" description="Review orders, update statuses and add internal notes." />
      <form className="mb-5 flex flex-wrap gap-2" method="get">
        <input className="input w-56" name="q" placeholder="Search order, customer..." defaultValue={q} />
        <select className="input w-48" name="status" defaultValue={status}>
          {STATUSES.map((s) => <option key={s} value={s}>{prettyStatus(s)}</option>)}
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>
      {orders.length ? (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Order ID</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Cycle</th><th>Status</th><th>Payment</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="font-mono text-xs text-neutral-300">{o.orderNumber}</td>
                    <td><p className="text-xs text-neutral-200">{o.user.name}</p><p className="text-[11px] text-neutral-600">{o.user.email}</p></td>
                    <td className="text-xs">{o.planName}</td>
                    <td>{formatMoney(o.amountCents, o.currency, settings.currencySymbol || "₹")}</td>
                    <td className="text-xs">{o.billingLabel}</td>
                    <td><span className={`badge-${statusTone(o.status)}`}>{prettyStatus(o.status)}</span></td>
                    <td><span className={`badge-${statusTone(o.paymentStatus)}`}>{prettyStatus(o.paymentStatus)}</span></td>
                    <td className="text-xs">{formatDate(o.createdAt)}</td>
                    <td><Link href={`/admin/orders/${o.id}`} className="btn-ghost px-2"><ArrowUpRight size={15} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <EmptyState title="No orders found" description="Adjust the filters or check back later." />}
    </>
  );
}
