"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Tag, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";
import { createOrderAction } from "@/lib/actions/orders";

type Period = { id: string; code: string; label: string; months: number; multiplier: number };
type CpuOption = { id: string; name: string; priceCents: number; inStock: boolean };

export function OrderForm({
  planId,
  basePriceCents,
  currency,
  symbol,
  periods,
  cpuOptions,
  taxCents,
  loggedIn,
  loginHref,
}: {
  planId: string;
  basePriceCents: number;
  currency: string;
  symbol: string;
  periods: Period[];
  cpuOptions: CpuOption[];
  taxCents: number;
  loggedIn: boolean;
  loginHref: string;
}) {
  const router = useRouter();
  const [periodId, setPeriodId] = useState(periods[0]?.id || "");
  const [cpuOptionId, setCpuOptionId] = useState(cpuOptions.find((c) => c.inStock)?.id || "");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ discountCents: number; code: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [checking, setChecking] = useState(false);
  const [pending, start] = useTransition();

  const selected = periods.find((p) => p.id === periodId);
  const cpu = cpuOptions.find((c) => c.id === cpuOptionId);
  const subtotal = Math.round(basePriceCents * (selected?.months || 1) * (selected?.multiplier || 1)) + (cpu?.priceCents || 0);
  const discount = applied?.discountCents || 0;
  const total = Math.max(0, subtotal - discount) + taxCents;

  async function applyCoupon() {
    if (!code.trim()) { setApplied(null); return; }
    setChecking(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, planId, billingPeriodId: periodId, cpuOptionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setApplied(null);
        setCouponError(data.error || "Invalid coupon");
      } else {
        setApplied({ discountCents: data.discountCents, code: code.toUpperCase() });
        toast.success("Coupon applied");
      }
    } catch {
      setCouponError("Unable to validate coupon");
    } finally {
      setChecking(false);
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!loggedIn) { router.push(loginHref); return; }
    const data = new FormData(e.currentTarget);
    data.set("planId", planId);
    data.set("billingPeriodId", periodId);
    data.set("cpuOptionId", cpuOptionId);
    data.set("couponCode", applied ? applied.code : "");
    start(async () => {
      const res = await createOrderAction(data);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="panel p-6">
      <h2 className="text-base font-semibold text-white">Configure your order</h2>
      <div className="mt-6 space-y-6">
        <div>
          <label className="label">Billing period</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {periods.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => { setPeriodId(p.id); setApplied(null); }}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${periodId === p.id ? "border-neutral-400 bg-white/[0.06] text-white" : "border-line bg-ink-850 text-neutral-400 hover:border-neutral-600"}`}
              >
                <span className="block font-medium">{p.label}</span>
                <span className="mt-0.5 block text-[10px] text-neutral-600">
                  {p.multiplier < 1 ? `Save ${Math.round((1 - p.multiplier) * 100)}%` : `${p.months} month${p.months > 1 ? "s" : ""}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        {cpuOptions.length > 0 && (
          <div>
            <label className="label" htmlFor="cpuOption">Select CPU</label>
            <select
              id="cpuOption"
              className="input"
              value={cpuOptionId}
              onChange={(e) => { setCpuOptionId(e.target.value); setApplied(null); }}
            >
              {cpuOptions.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.inStock}>
                  {c.name}{c.priceCents > 0 ? ` — +${formatMoney(c.priceCents, currency, symbol)}` : " — Free"}{!c.inStock ? " (Out of stock)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor="coupon">Coupon code (optional)</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag size={14} className="absolute left-3 top-3 text-neutral-600" />
              <input id="coupon" className="input pl-9 uppercase" placeholder="e.g. WELCOME10" value={code} onChange={(e) => { setCode(e.target.value); setApplied(null); setCouponError(""); }} />
            </div>
            <button type="button" className="btn-secondary" onClick={applyCoupon} disabled={checking}>
              {checking ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
            </button>
          </div>
          {couponError && <p className="field-error flex items-center gap-1"><AlertCircle size={12} />{couponError}</p>}
          {applied && <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 size={12} /> Coupon {applied.code} applied</p>}
        </div>

        <div className="rounded-xl border border-line bg-ink-850 p-4">
          <div className="flex justify-between text-xs text-neutral-500"><span>Subtotal</span><span>{formatMoney(subtotal, currency, symbol)}</span></div>
          {cpu && <div className="mt-2 flex justify-between text-xs text-neutral-400"><span>CPU: {cpu.name}</span><span>{formatMoney(cpu.priceCents, currency, symbol)}</span></div>}
          {discount > 0 && <div className="mt-2 flex justify-between text-xs text-emerald-400"><span>Discount</span><span>-{formatMoney(discount, currency, symbol)}</span></div>}
          <div className="mt-2 flex justify-between text-xs text-neutral-500"><span>Tax</span><span>{formatMoney(taxCents, currency, symbol)}</span></div>
          <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-semibold text-white"><span>Total</span><span>{formatMoney(total, currency, symbol)}</span></div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={pending || !periodId}>
          {pending && <Loader2 size={15} className="animate-spin" />}
          {loggedIn ? "Continue to payment" : "Sign in to order"}
        </button>
        <p className="text-center text-[11px] text-neutral-600">An invoice will be created. Services are activated only after verified payment.</p>
      </div>
    </form>
  );
}
