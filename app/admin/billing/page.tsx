import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import { PageHeader, EmptyState, StatCard } from "@/components/ui";
import { TransactionActions } from "@/components/transaction-actions";
import { ManualInvoice } from "@/components/manual-invoice";
import { updateInvoiceStatusFormAction } from "@/lib/actions/admin-billing";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage({ searchParams }: {
  searchParams: { q?: string; status?: string; method?: string; from?: string; to?: string; invoice?: string };
}) {
  const status = searchParams.status || "ALL";
  const method = searchParams.method || "ALL";
  const q = searchParams.q || "";
  const from = searchParams.from ? new Date(searchParams.from) : undefined;
  const to = searchParams.to ? new Date(`${searchParams.to}T23:59:59`) : undefined;

  const [settings, transactions, invoices, customers, allSuccess, pendingCount, failedCount, refundCount] = await Promise.all([
    getSettings(),
    prisma.transaction.findMany({
      where: {
        ...(status !== "ALL" ? { status } : {}),
        ...(method !== "ALL" ? { gateway: method } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(q ? { OR: [
          { transactionId: { contains: q } }, { gatewayRef: { contains: q } },
          { user: { name: { contains: q } } }, { user: { email: { contains: q } } },
        ] } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } }, invoice: { select: { invoiceNumber: true } } },
      take: 200,
    }),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 60, include: { user: { select: { name: true, email: true } } } }),
    prisma.user.findMany({ where: { role: "CUSTOMER" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({ where: { status: "SUCCESS" }, select: { amountCents: true } }),
    prisma.transaction.count({ where: { status: "PENDING" } }),
    prisma.transaction.count({ where: { status: "FAILED" } }),
    prisma.transaction.count({ where: { status: "REFUNDED" } }),
  ]);

  const symbol = settings.currencySymbol || "₹";
  const revenue = allSuccess.reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <>
      <PageHeader title="Billing" description="Invoices, transactions, verification and revenue reports." action={<ManualInvoice customers={customers} />} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Verified revenue" value={formatMoney(revenue, settings.currency || "INR", symbol)} />
        <StatCard label="Pending payments" value={pendingCount} />
        <StatCard label="Failed payments" value={failedCount} />
        <StatCard label="Refunds recorded" value={refundCount} />
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-sm font-medium text-white">Invoices</h2>
          {searchParams.invoice && <span className="text-[11px] text-amber-400">Highlighting {searchParams.invoice}</span>}
        </div>
        {invoices.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Status</th><th>Change status</th><th>Date</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className={searchParams.invoice === inv.id ? "bg-white/[0.04]" : ""}>
                    <td className="font-mono text-xs">{inv.invoiceNumber}</td>
                    <td><p className="text-xs text-neutral-200">{inv.user.name}</p><p className="text-[11px] text-neutral-600">{inv.user.email}</p></td>
                    <td className="text-xs">{inv.planName}</td>
                    <td>{formatMoney(inv.totalCents, inv.currency, symbol)}</td>
                    <td><span className={`badge-${inv.status === "PAID" ? "emerald" : inv.status === "UNPAID" ? "amber" : "zinc"}`}>{inv.status}</span></td>
                    <td>
                      <form className="flex items-center gap-1" action={updateInvoiceStatusFormAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <select name="status" className="input w-28 px-2 py-1 text-[11px]" defaultValue={inv.status}>
                          {["DRAFT", "UNPAID", "PAID", "CANCELLED", "REFUNDED"].map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <button className="btn-ghost px-2" title="Update status">Save</button>
                      </form>
                    </td>
                    <td className="text-xs">{formatDate(inv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-5"><EmptyState title="No invoices yet" /></div>}
      </section>

      <section className="panel mt-6 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-medium text-white">Transactions</h2>
        </div>
        <form className="flex flex-wrap gap-2 border-b border-line p-4" method="get">
          <input className="input w-48" name="q" placeholder="Search transaction..." defaultValue={q} />
          <select className="input w-36" name="status" defaultValue={status}>
            {["ALL", "PENDING", "SUCCESS", "FAILED", "REFUNDED"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input w-36" name="method" defaultValue={method}>
            {["ALL", "manual", "fampay", "razorpay", "stripe"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className="input w-36" type="date" name="from" defaultValue={searchParams.from || ""} />
          <input className="input w-36" type="date" name="to" defaultValue={searchParams.to || ""} />
          <button className="btn-secondary" type="submit">Filter</button>
        </form>
        {transactions.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Transaction</th><th>Customer</th><th>Invoice</th><th>Gateway</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{t.transactionId}</td>
                    <td><p className="text-xs text-neutral-200">{t.user.name}</p><p className="text-[11px] text-neutral-600">{t.user.email}</p></td>
                    <td className="font-mono text-[11px] text-neutral-500">{t.invoice?.invoiceNumber || "—"}</td>
                    <td className="text-xs capitalize">{t.gateway}</td>
                    <td>{formatMoney(t.amountCents, t.currency, symbol)}</td>
                    <td><span className={`badge-${t.status === "SUCCESS" ? "emerald" : t.status === "PENDING" ? "amber" : t.status === "FAILED" ? "rose" : "zinc"}`}>{t.status}</span></td>
                    <td className="text-xs">{formatDate(t.createdAt)}</td>
                    <td><TransactionActions id={t.id} status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-5"><EmptyState title="No transactions found" description="Adjust the filters above." /></div>}
      </section>
    </>
  );
}
