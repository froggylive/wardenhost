import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getEnabledGateways } from "@/lib/payments";
import { formatDate, formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";
import { InvoicePayment } from "@/components/invoice-payment";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: user.id },
    include: { items: true, transactions: { orderBy: { createdAt: "desc" } }, user: true },
  });
  if (!invoice) notFound();
  const [settings, gateways] = await Promise.all([getSettings(), getEnabledGateways()]);
  const symbol = settings.currencySymbol || "₹";

  return (
    <>
      <Link href="/client/invoices" className="btn-ghost mb-6 -ml-2 text-xs"><ArrowLeft size={14} /> Back to invoices</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-eyebrow">Invoice</div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-white">{invoice.invoiceNumber}</h1>
          <p className="mt-1 text-xs text-neutral-500">Issued {formatDate(invoice.createdAt)} · Due {formatDate(invoice.dueDate)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={invoice.status} />
          <a href={`/api/invoices/${invoice.id}/pdf`} className="btn-secondary"><Download size={14} /> PDF</a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="panel overflow-hidden">
          <div className="grid gap-6 border-b border-line p-6 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-600">Billed to</div>
              <p className="text-sm font-medium text-white">{invoice.user.name}</p>
              <p className="text-xs text-neutral-500">{invoice.user.email}</p>
              {invoice.user.company && <p className="text-xs text-neutral-500">{invoice.user.company}</p>}
            </div>
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-600">Details</div>
              <p className="text-xs text-neutral-400">Plan: {invoice.planName}</p>
              <p className="text-xs text-neutral-400">Billing period: {invoice.billingLabel}</p>
              <p className="text-xs text-neutral-400">Status: {invoice.status}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}><td>{item.description}</td><td>{item.quantity}</td><td>{formatMoney(item.amountCents, invoice.currency, symbol)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 border-t border-line p-6">
            <div className="flex justify-between text-xs text-neutral-500"><span>Subtotal</span><span>{formatMoney(invoice.subtotalCents, invoice.currency, symbol)}</span></div>
            <div className="flex justify-between text-xs text-neutral-500"><span>Discount</span><span>- {formatMoney(invoice.discountCents, invoice.currency, symbol)}</span></div>
            <div className="flex justify-between text-xs text-neutral-500"><span>Tax</span><span>{formatMoney(invoice.taxCents, invoice.currency, symbol)}</span></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold text-white"><span>Total</span><span>{formatMoney(invoice.totalCents, invoice.currency, symbol)}</span></div>
          </div>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<div className="skeleton h-64 w-full" />}>
            <InvoicePayment
              invoiceId={invoice.id}
              totalCents={invoice.totalCents}
              currency={invoice.currency}
              symbol={symbol}
              status={invoice.status}
              gateways={gateways}
              manualInfo={{
                instructions: String(settings.manualPaymentInstructions || ""),
                bankName: String(settings.bankName || ""),
                bankAccount: String(settings.bankAccount || ""),
                bankIfsc: String(settings.bankIfsc || ""),
                bankHolder: String(settings.bankHolder || ""),
              }}
            />
          </Suspense>
          {invoice.transactions.length > 0 && (
            <div className="panel p-5">
              <h3 className="mb-3 text-sm font-medium text-white">Payment attempts</h3>
              <div className="space-y-2">
                {invoice.transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-line bg-ink-850 px-3 py-2 text-[11px]">
                    <span className="font-mono text-neutral-400">{t.transactionId}</span>
                    <span className="text-neutral-500">{t.gateway} · <StatusBadge status={t.status} /></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
