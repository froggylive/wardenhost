import Link from "next/link";
import { Download, ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const user = await requireUser();
  const [invoices, settings] = await Promise.all([
    prisma.invoice.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="Invoices" description="Your billing history and payments." />
      {invoices.length ? (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Invoice</th><th>Plan</th><th>Period</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-xs text-neutral-300">{inv.invoiceNumber}</td>
                    <td className="text-neutral-200">{inv.planName}</td>
                    <td className="text-xs">{inv.billingLabel}</td>
                    <td className="font-medium text-white">{formatMoney(inv.totalCents, inv.currency, settings.currencySymbol || "₹")}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td className="text-xs">{formatDate(inv.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <a href={`/api/invoices/${inv.id}/pdf`} className="btn-ghost px-2" title="Download PDF"><Download size={14} /></a>
                        <Link href={`/client/invoices/${inv.id}`} className="btn-ghost px-2" title="View invoice"><ArrowUpRight size={15} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <EmptyState title="No invoices yet" description="Invoices generated from orders will appear here." />}
    </>
  );
}
