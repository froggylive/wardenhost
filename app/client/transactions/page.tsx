import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await requireUser();
  const [transactions, settings] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="Transactions" description="A record of all payment attempts on your account." />
      {transactions.length ? (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Transaction ID</th><th>Gateway</th><th>Method</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs text-neutral-300">{t.transactionId}</td>
                    <td className="capitalize text-xs">{t.gateway}</td>
                    <td className="text-xs">{t.paymentMethod || "—"}</td>
                    <td>{formatMoney(t.amountCents, t.currency, settings.currencySymbol || "₹")}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-xs">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <EmptyState title="No transactions yet" description="Payment attempts will be recorded here." />}
    </>
  );
}
