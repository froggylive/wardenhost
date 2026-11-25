import Link from "next/link";
import { Server, ShoppingBag, FileText, CreditCard, ArrowUpRight, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import { PageHeader, StatCard, StatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClientDashboard() {
  const user = await requireUser();
  const [settings, services, activeServices, pendingOrders, unpaidInvoices, transactions, orders] = await Promise.all([
    getSettings(),
    prisma.service.count({ where: { userId: user.id } }),
    prisma.service.count({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.order.count({ where: { userId: user.id, status: { in: ["PENDING", "AWAITING_PAYMENT", "PROCESSING"] } } }),
    prisma.invoice.count({ where: { userId: user.id, status: "UNPAID" } }),
    prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const symbol = settings.currencySymbol || "₹";

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Here is an overview of your services and billing."
        action={<Link href="/order" className="btn-primary"><Plus size={15} /> Order a service</Link>}
      />
      {!user.emailVerified && (
        <div className="mb-6 rounded-xl border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-xs text-amber-300">
          Your email address is not verified. Check your inbox for the verification link.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total services" value={services} icon={Server} />
        <StatCard label="Active services" value={activeServices} icon={Server} />
        <StatCard label="Pending orders" value={pendingOrders} icon={ShoppingBag} />
        <StatCard label="Unpaid invoices" value={unpaidInvoices} icon={FileText} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-medium text-white">Recent orders</h2>
            <Link href="/client/orders" className="text-[11px] text-neutral-500 hover:text-white">View all</Link>
          </div>
          {orders.length ? (
            <div className="divide-y divide-line/60">
              {orders.map((o) => (
                <Link href={`/client/orders/${o.id}`} key={o.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-white/[0.02]">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-200">{o.planName} <span className="text-neutral-600">· {o.orderNumber}</span></p>
                    <p className="mt-0.5 text-[11px] text-neutral-600">{formatDate(o.createdAt)} · {o.billingLabel}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3"><span className="text-xs text-neutral-300">{formatMoney(o.amountCents, o.currency, symbol)}</span><StatusBadge status={o.status} /></div>
                </Link>
              ))}
            </div>
          ) : <div className="p-5"><EmptyState title="No orders yet" description="Your orders will appear here." /></div>}
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-medium text-white">Recent transactions</h2>
            <Link href="/client/transactions" className="text-[11px] text-neutral-500 hover:text-white">View all</Link>
          </div>
          {transactions.length ? (
            <div className="divide-y divide-line/60">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-850 text-neutral-500"><CreditCard size={14} /></div>
                    <div>
                      <p className="text-xs font-medium text-neutral-200">{t.transactionId}</p>
                      <p className="text-[11px] text-neutral-600">{t.gateway} · {formatDate(t.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3"><span className="text-xs text-neutral-300">{formatMoney(t.amountCents, t.currency, symbol)}</span><StatusBadge status={t.status} /></div>
                </div>
              ))}
            </div>
          ) : <div className="p-5"><EmptyState title="No transactions yet" description="Payments you make will appear here." /></div>}
        </section>
      </div>

      {unpaidInvoices > 0 && (
        <Link href="/client/invoices" className="mt-6 flex items-center justify-between rounded-xl border border-amber-900/50 bg-amber-950/10 px-5 py-4 text-sm text-amber-200 transition-colors hover:bg-amber-950/20">
          You have {unpaidInvoices} unpaid invoice{unpaidInvoices > 1 ? "s" : ""}. Review and pay now. <ArrowUpRight size={15} />
        </Link>
      )}
    </>
  );
}
