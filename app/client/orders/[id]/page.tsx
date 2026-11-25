import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/ui";
import { CancelOrderButton } from "@/components/cancel-order-button";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const [order, settings] = await Promise.all([
    prisma.order.findFirst({ where: { id: params.id, userId: user.id }, include: { invoices: true, transactions: true } }),
    getSettings(),
  ]);
  if (!order) notFound();

  const rows: [string, React.ReactNode][] = [
    ["Order number", <span className="font-mono">{order.orderNumber}</span>],
    ["Plan", order.planName], ["CPU option", order.cpuName || "Default plan CPU"],
    ["Billing cycle", order.billingLabel],
    ["Amount", formatMoney(order.amountCents, order.currency, settings.currencySymbol || "₹")],
    ["Discount", formatMoney(order.discountCents, order.currency, settings.currencySymbol || "₹")],
    ["Tax", formatMoney(order.taxCents, order.currency, settings.currencySymbol || "₹")],
    ["Coupon", order.couponCode || "—"],
    ["Status", <StatusBadge status={order.status} />],
    ["Payment", <StatusBadge status={order.paymentStatus} />],
    ["Created", formatDate(order.createdAt)],
  ];

  return (
    <>
      <Link href="/client/orders" className="btn-ghost mb-6 -ml-2 text-xs"><ArrowLeft size={14} /> Back to orders</Link>
      <PageHeader
        title={order.orderNumber}
        description="Order details"
        action={["PENDING", "AWAITING_PAYMENT", "PROCESSING"].includes(order.status) ? <CancelOrderButton orderId={order.id} /> : undefined}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <dl className="divide-y divide-line/60">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-3 text-sm"><dt className="text-neutral-500">{label}</dt><dd className="text-right font-medium text-neutral-200">{value}</dd></div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium text-white">Invoices</h2>
          <div className="space-y-2">
            {order.invoices.length ? order.invoices.map((inv) => (
              <Link key={inv.id} href={`/client/invoices/${inv.id}`} className="flex items-center justify-between rounded-lg border border-line bg-ink-900 px-4 py-3 text-xs hover:border-neutral-600">
                <span className="font-mono text-neutral-300">{inv.invoiceNumber}</span>
                <span className="flex items-center gap-3"><StatusBadge status={inv.status} /><span className="text-neutral-300">{formatMoney(inv.totalCents, inv.currency, settings.currencySymbol || "₹")}</span></span>
              </Link>
            )) : <p className="text-xs text-neutral-600">No invoices for this order.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
