import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/ui";
import { cancelOrderFormAction, updateOrderFormAction } from "@/lib/actions/admin-billing";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "AWAITING_PAYMENT", "PROCESSING", "ACTIVE", "CANCELLED", "FAILED"];

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { user: true, invoices: true, transactions: true },
  });
  if (!order) notFound();
  const settings = await getSettings();
  const rows: [string, React.ReactNode][] = [
    ["Order number", <span className="font-mono">{order.orderNumber}</span>],
    ["Customer", `${order.user.name} (${order.user.email})`],
    ["Plan", order.planName], ["CPU option", order.cpuName || "Default plan CPU"], ["Billing cycle", order.billingLabel],
    ["Amount", formatMoney(order.amountCents, order.currency, settings.currencySymbol || "₹")],
    ["Discount", formatMoney(order.discountCents, order.currency, settings.currencySymbol || "₹")],
    ["Tax", formatMoney(order.taxCents, order.currency, settings.currencySymbol || "₹")],
    ["Coupon", order.couponCode || "—"], ["Status", <StatusBadge status={order.status} />],
    ["Payment", <StatusBadge status={order.paymentStatus} />], ["Created", formatDate(order.createdAt)],
  ];
  return (
    <>
      <Link href="/admin/orders" className="btn-ghost mb-6 -ml-2 text-xs"><ArrowLeft size={14} /> Back to orders</Link>
      <PageHeader title={order.orderNumber} description="Order details and administrative controls." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <dl className="divide-y divide-line/60">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-3 text-sm"><dt className="shrink-0 text-neutral-500">{label}</dt><dd className="text-right font-medium text-neutral-200">{value}</dd></div>
            ))}
          </dl>
          <div className="mt-6 space-y-2">
            {order.invoices.map((inv) => (
              <Link key={inv.id} href={`/admin/billing?invoice=${inv.id}`} className="flex items-center justify-between rounded-lg border border-line bg-ink-850 px-3 py-2 text-xs hover:border-neutral-600">
                <span className="font-mono">{inv.invoiceNumber}</span><StatusBadge status={inv.status} />
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <form className="panel p-6" action={updateOrderFormAction}>
            <input type="hidden" name="id" value={order.id} />
            <h2 className="mb-5 text-sm font-medium text-white">Update order</h2>
            <label className="label" htmlFor="status">Order status</label>
            <select id="status" name="status" className="input" defaultValue={order.status}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <label className="label mt-4 block" htmlFor="notes">Internal notes</label>
            <textarea id="notes" name="notes" className="textarea" defaultValue={order.notes || ""} placeholder="Only administrators can see this" />
            <button className="btn-primary mt-5" type="submit">Save changes</button>
          </form>
          {order.status !== "CANCELLED" && (
            <form action={cancelOrderFormAction}>
              <input type="hidden" name="id" value={order.id} />
              <button className="btn-danger" type="submit">Cancel order</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
