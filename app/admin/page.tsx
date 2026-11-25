import Link from "next/link";
import { Users, Server, Layers, ShoppingBag, FileText, CreditCard, Wallet, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import { PageHeader, StatCard, StatusBadge, EmptyState } from "@/components/ui";
import { RevenueChart } from "@/components/revenue-chart";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    customers, plans, categories, orders, activeServices, pendingOrders, invoices,
    paidInvoices, recentTransactions, recentUsers, settings,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.plan.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.service.count({ where: { status: "ACTIVE" } }),
    prisma.order.count({ where: { status: { in: ["PENDING", "AWAITING_PAYMENT", "PROCESSING"] } } }),
    prisma.invoice.count(),
    prisma.invoice.findMany({ where: { status: "PAID" }, select: { totalCents: true, paidAt: true } }),
    prisma.transaction.findMany({ where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { name: true } } } }),
    prisma.user.findMany({ where: { role: "CUSTOMER" }, orderBy: { createdAt: "desc" }, take: 6 }),
    getSettings(),
  ]);

  const revenue = paidInvoices.reduce((sum, i) => sum + i.totalCents, 0);
  const symbol = settings.currencySymbol || "₹";

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const total = paidInvoices
      .filter((inv) => inv.paidAt && inv.paidAt >= d && inv.paidAt < end)
      .reduce((sum, inv) => sum + inv.totalCents / 100, 0);
    return { label: d.toLocaleString("en-IN", { month: "short" }), revenue: Math.round(total) };
  });

  return (
    <>
      <PageHeader title="Overview" description="Real-time statistics from your hosting platform." action={<Link href="/admin/plans" className="btn-primary"><Server size={15} /> Manage plans</Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total customers" value={customers} icon={Users} />
        <StatCard label="Hosting plans" value={plans} icon={Server} />
        <StatCard label="Categories" value={categories} icon={Layers} />
        <StatCard label="Total orders" value={orders} icon={ShoppingBag} />
        <StatCard label="Active services" value={activeServices} icon={Server} />
        <StatCard label="Pending orders" value={pendingOrders} icon={ShoppingBag} />
        <StatCard label="Total invoices" value={invoices} icon={FileText} />
        <StatCard label="Revenue" value={formatMoney(revenue, settings.currency || "INR", symbol)} icon={Wallet} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-sm font-medium text-white">Revenue</h2><p className="text-[11px] text-neutral-600">Verified payments, last 6 months</p></div>
            <span className="text-xs text-neutral-500">{formatMoney(revenue, settings.currency || "INR", symbol)} total</span>
          </div>
          <RevenueChart data={chartData} />
        </section>
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-medium text-white">Recent registrations</h2>
            <Link href="/admin/customers" className="text-[11px] text-neutral-500 hover:text-white">View all</Link>
          </div>
          {recentUsers.length ? (
            <div className="divide-y divide-line/60">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div><p className="text-xs font-medium text-neutral-200">{u.name}</p><p className="text-[11px] text-neutral-600">{u.email}</p></div>
                  <span className="text-[11px] text-neutral-600">{formatDate(u.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : <div className="p-5"><EmptyState title="No registrations yet" /></div>}
        </section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-medium text-white">Recent transactions</h2>
          <Link href="/admin/billing" className="text-[11px] text-neutral-500 hover:text-white">View billing</Link>
        </div>
        {recentTransactions.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Transaction</th><th>Customer</th><th>Gateway</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {recentTransactions.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{t.transactionId}</td>
                    <td>{t.user.name}</td>
                    <td className="capitalize text-xs">{t.gateway}</td>
                    <td>{formatMoney(t.amountCents, t.currency, symbol)}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-xs">{formatDate(t.createdAt)}</td>
                    <td><Link href="/admin/billing" className="btn-ghost px-2"><ArrowUpRight size={14} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-5"><EmptyState title="No transactions yet" description="Verified payments will appear here." /></div>}
      </section>
    </>
  );
}
