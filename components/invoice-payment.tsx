"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, Banknote, CreditCard, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";

type Gateway = { code: string; name: string; description: string | null; kind?: string };

export function InvoicePayment({
  invoiceId,
  totalCents,
  currency,
  symbol,
  status,
  gateways,
  manualInfo,
}: {
  invoiceId: string;
  totalCents: number;
  currency: string;
  symbol: string;
  status: string;
  gateways: Gateway[];
  manualInfo: { instructions: string; bankName: string; bankAccount: string; bankIfsc: string; bankHolder: string };
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState(false);
  const [showFampay, setShowFampay] = useState(false);
  const [fampayQr, setFampayQr] = useState<{
    mode?: string;
    qrDataUrl?: string;
    qrUrl?: string;
    checkoutUrl?: string;
    orderId?: string;
    payableAmount?: string;
    upiIntent?: string;
    upiId: string;
    merchantName?: string;
    amountCents: number;
    currency: string;
    invoiceNumber: string;
  } | null>(null);
  const [fampayLoading, setFampayLoading] = useState(false);
  const [fampayReference, setFampayReference] = useState("");
  const [fampayNote, setFampayNote] = useState("");
  const [customResult, setCustomResult] = useState<{ code: string; url?: string; qrUrl?: string } | null>(null);
  const [customReference, setCustomReference] = useState("");

  const stripeSession = search.get("session_id");
  useEffect(() => {
    if (status === "UNPAID" && search.get("stripe") === "success" && stripeSession) {
      setBusy("stripe");
      fetch("/api/payments/stripe/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, sessionId: stripeSession }),
      })
        .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); toast.success("Payment verified"); setDone(true); router.refresh(); })
        .catch((e) => toast.error(e.message || "Could not verify payment"))
        .finally(() => setBusy(""));
    }
  }, [stripeSession, invoiceId, status, router, search]);

  useEffect(() => {
    if (status !== "UNPAID" || search.get("fam") !== "success") return;
    const orderId = sessionStorage.getItem(`fampay_order_${invoiceId}`);
    if (!orderId) return;
    fetch("/api/payments/fampay/status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.status === "success") { toast.success("Payment verified"); setDone(true); router.refresh(); } })
      .catch(() => {});
  }, [invoiceId, status, router, search]);

  const gatewayOrderId = fampayQr?.mode === "fampay-gateway" ? fampayQr.orderId : undefined;
  useEffect(() => {
    if (!gatewayOrderId || status !== "UNPAID") return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/payments/fampay/status", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: gatewayOrderId }),
        });
        const data = await res.json();
        if (!active) return;
        if (data.status === "success") {
          toast.success("Payment verified");
          setDone(true);
          router.refresh();
        } else if (data.status === "expired") {
          toast.error("Payment session expired. Please generate a new QR.");
          setFampayQr(null);
        }
      } catch { /* keep polling */ }
    };
    const timer = setInterval(poll, 4000);
    return () => { active = false; clearInterval(timer); };
  }, [gatewayOrderId, status, router]);

  if (status === "PAID") {
    return (
      <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5 text-sm text-emerald-300">
        <span className="flex items-center gap-2 font-medium"><CheckCircle2 size={16} /> Invoice paid</span>
        <p className="mt-1.5 text-xs text-emerald-400/70">Payment has been verified and your service entitlement is active.</p>
      </div>
    );
  }
  if (status !== "UNPAID") {
    return <div className="rounded-xl border border-line bg-ink-850 p-5 text-sm text-neutral-400">This invoice is {status.toLowerCase()} and cannot be paid.</div>;
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await fetch("/api/payments/manual", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, method: "manual", reference, note }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Unable to submit payment");
      else { toast.success(data.message); setDone(true); setReference(""); router.refresh(); }
    });
  }

  async function payRazorpay() {
    setBusy("razorpay");
    try {
      const res = await fetch("/api/payments/razorpay/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start payment");
      const w = window as any;
      if (!w.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Unable to load payment checkout"));
          document.body.appendChild(s);
        });
      }
      const rzp = new w.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "WardenHost",
        description: `Invoice ${invoiceId.slice(0, 8)}`,
        order_id: data.orderId,
        handler: async (response: any) => {
          const verify = await fetch("/api/payments/razorpay/verify", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoiceId, orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }),
          });
          const vd = await verify.json();
          if (!verify.ok) toast.error(vd.error || "Verification failed");
          else { toast.success("Payment verified"); setDone(true); router.refresh(); }
        },
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally {
      setBusy("");
    }
  }

  async function payStripe() {
    setBusy("stripe");
    try {
      const res = await fetch("/api/payments/stripe/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start checkout");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
      setBusy("");
    }
  }

  async function payCustom(gateway: Gateway) {
    if (gateway.kind === "manual") return;
    setBusy(gateway.code);
    try {
      const res = await fetch("/api/payments/custom/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, code: gateway.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start payment");
      if (data.url) { window.location.href = data.url; return; }
      setCustomResult({ code: gateway.code, qrUrl: data.qrUrl });
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally { setBusy(""); }
  }

  function submitCustomManual(e: React.FormEvent, gateway: Gateway) {
    e.preventDefault();
    start(async () => {
      const res = await fetch("/api/payments/custom/manual", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, code: gateway.code, reference: customReference }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Unable to submit payment");
      else { toast.success(data.message); setDone(true); setCustomReference(""); router.refresh(); }
    });
  }

  async function loadFampayQr() {
    setFampayLoading(true);
    try {
      const res = await fetch("/api/payments/fampay/qr", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to generate QR code");
      setFampayQr(data);
      setShowFampay(true);
      if (data.orderId) sessionStorage.setItem(`fampay_order_${invoiceId}`, data.orderId);
    } catch (e: any) {
      toast.error(e.message || "Unable to generate QR code");
    } finally {
      setFampayLoading(false);
    }
  }

  function submitFampay(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await fetch("/api/payments/fampay/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, method: "fampay", reference: fampayReference, note: fampayNote }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Unable to submit payment");
      else { toast.success(data.message); setDone(true); setFampayReference(""); setFampayNote(""); router.refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      {done && (
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-xs text-amber-200">
          Your payment has been submitted. The invoice will be marked paid after verification.
        </div>
      )}
      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Amount due</h3>
          <span className="text-xl font-semibold text-white">{formatMoney(totalCents, currency, symbol)}</span>
        </div>

        <div className="mt-5 space-y-2">
          {gateways.some((g) => g.code === "fampay") && (
            <button className="btn-primary w-full" onClick={loadFampayQr} disabled={fampayLoading}>
              {fampayLoading ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />} Pay with FamPay UPI QR
            </button>
          )}
          {gateways.filter((g) => g.code.startsWith("custom_") && g.kind !== "manual").map((g) => (
            <button key={g.code} className="btn-secondary w-full" onClick={() => payCustom(g)} disabled={!!busy}>
              {busy === g.code ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />} Pay with {g.name}
            </button>
          ))}
          {gateways.some((g) => g.code === "razorpay") && (
            <button className="btn-primary w-full" onClick={payRazorpay} disabled={!!busy}>
              {busy === "razorpay" ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />} Pay with Razorpay
            </button>
          )}
          {gateways.some((g) => g.code === "stripe") && (
            <button className="btn-secondary w-full" onClick={payStripe} disabled={!!busy}>
              {busy === "stripe" ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />} Pay with Stripe
            </button>
          )}
        </div>

        {gateways.some((g) => g.code === "fampay") && showFampay && fampayQr && (
          <div className="mt-6 border-t border-line pt-5">
            <h4 className="flex items-center gap-2 text-xs font-medium text-neutral-200"><QrCode size={15} /> FamPay UPI QR</h4>
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
              {fampayQr.mode === "fampay-gateway"
                ? "Scan the QR or open the hosted checkout. Payment status is checked automatically — this page updates when payment is confirmed."
                : "Scan this QR with FamPay or any UPI app, pay the exact amount, then submit the UPI transaction reference for verification."}
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex flex-col items-center rounded-xl border border-line bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fampayQr.qrUrl || fampayQr.qrDataUrl}
                  alt="UPI payment QR code"
                  className="h-48 w-48"
                />
                <p className="mt-3 text-center text-xs font-semibold text-black">
                  {fampayQr.payableAmount
                    ? `₹${fampayQr.payableAmount}`
                    : formatMoney(fampayQr.amountCents, fampayQr.currency, symbol)}
                </p>
                <p className="text-center text-[11px] text-neutral-600">{fampayQr.invoiceNumber}</p>
              </div>

              <div className="rounded-lg border border-line bg-ink-850 p-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-600">
                  {fampayQr.orderId ? "Payment session" : "UPI ID"}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs text-neutral-200">
                    {fampayQr.orderId || fampayQr.upiId}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost shrink-0 px-2"
                    title="Copy"
                    onClick={() => {
                      navigator.clipboard?.writeText(fampayQr.orderId || fampayQr.upiId);
                      toast.success("Copied");
                    }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
                {fampayQr.upiId && <p className="mt-1 text-[10px] text-neutral-600">UPI ID: {fampayQr.upiId}</p>}
                {fampayQr.merchantName && <p className="mt-1 text-[10px] text-neutral-600">Payee: {fampayQr.merchantName}</p>}
              </div>

              {fampayQr.checkoutUrl && (
                <a href={fampayQr.checkoutUrl} target="_blank" rel="noreferrer" className="btn-secondary w-full">
                  Open hosted checkout
                </a>
              )}
              {fampayQr.upiIntent && (
                <a href={fampayQr.upiIntent} className="btn-secondary w-full">Pay via UPI app</a>
              )}

              {fampayQr.mode !== "fampay-gateway" ? (
                <form onSubmit={submitFampay} className="space-y-3">
                  <div>
                    <label className="label" htmlFor="fampay-reference">UPI transaction reference</label>
                    <input id="fampay-reference" className="input" value={fampayReference} onChange={(e) => setFampayReference(e.target.value)} placeholder="e.g. 123456789012" required />
                  </div>
                  <div>
                    <label className="label" htmlFor="fampay-note">Note (optional)</label>
                    <input id="fampay-note" className="input" value={fampayNote} onChange={(e) => setFampayNote(e.target.value)} placeholder="Any additional details" />
                  </div>
                  <button type="submit" className="btn-primary w-full" disabled={pending}>
                    {pending && <Loader2 size={14} className="animate-spin" />} I have paid — verify payment
                  </button>
                </form>
              ) : (
                <button className="btn-ghost w-full" onClick={loadFampayQr} disabled={fampayLoading}>
                  Generate a new QR
                </button>
              )}
            </div>
          </div>
        )}

        {gateways.filter((g) => g.code.startsWith("custom_")).map((g) => (
          <div key={g.code} className="mt-6 border-t border-line pt-5">
            <h4 className="text-xs font-medium text-neutral-200">{g.name}</h4>
            {g.description && <p className="mt-1 text-[11px] text-neutral-500">{g.description}</p>}
            {customResult?.code === g.code && customResult.qrUrl && (
              <div className="mt-4 flex flex-col items-center rounded-xl border border-line bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={customResult.qrUrl} alt={`${g.name} QR code`} className="h-48 w-48 object-contain" />
              </div>
            )}
            {g.kind === "manual" && (
              <div className="mt-3">
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-500">{g.description}</p>
                <form className="mt-3 space-y-3" onSubmit={(e) => submitCustomManual(e, g)}>
                  <input className="input" value={customReference} onChange={(e) => setCustomReference(e.target.value)} placeholder="Payment reference" required />
                  <button className="btn-primary w-full" disabled={pending}>Submit for verification</button>
                </form>
              </div>
            )}
          </div>
        ))}

        {gateways.some((g) => g.code === "manual") && (
          <div className="mt-6 border-t border-line pt-5">
            <h4 className="flex items-center gap-2 text-xs font-medium text-neutral-300"><Banknote size={14} /> Manual payment</h4>
            <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">{manualInfo.instructions}</p>
            <div className="mt-3 rounded-lg border border-line bg-ink-850 p-3 text-[11px] text-neutral-400">
              <p>Bank: {manualInfo.bankName}</p><p>Account: {manualInfo.bankAccount}</p>
              <p>IFSC: {manualInfo.bankIfsc}</p><p>Holder: {manualInfo.bankHolder}</p>
            </div>
            <form onSubmit={submitManual} className="mt-4 space-y-3">
              <div>
                <label className="label" htmlFor="reference">Transaction / UPI reference</label>
                <input id="reference" className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 123456789012" required />
              </div>
              <div>
                <label className="label" htmlFor="note">Note (optional)</label>
                <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any additional details" />
              </div>
              <button type="submit" className="btn-secondary w-full" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />} Submit for verification</button>
            </form>
          </div>
        )}
        {gateways.length === 0 && <p className="mt-4 text-xs text-rose-400">No payment methods are currently configured. Contact support.</p>}
      </div>
    </div>
  );
}
