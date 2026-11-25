import Link from "next/link";
import { Check, ArrowUpRight, MemoryStick, Cpu, HardDrive, Gauge, Network, Globe } from "lucide-react";
import type { Plan, PlanFeature } from "@prisma/client";
import { formatMoney } from "@/lib/utils";

type PlanWithFeatures = Plan & { features: PlanFeature[] };

export function PlanCard({ plan, symbol, currency }: { plan: PlanWithFeatures; symbol: string; currency: string }) {
  const specs = [
    { icon: MemoryStick, label: "Memory", value: plan.ram },
    { icon: Cpu, label: "CPU", value: plan.cpu },
    { icon: HardDrive, label: "Storage", value: `${plan.disk} ${plan.storageType}` },
    { icon: Gauge, label: "Bandwidth", value: plan.bandwidth },
    { icon: Network, label: "Network", value: plan.networkSpeed },
    { icon: Globe, label: "IPv4", value: `${plan.ipv4Count} IPv4` },
  ];

  return (
    <article className={`panel panel-hover relative flex flex-col overflow-hidden ${plan.featured ? "border-neutral-600" : ""}`}>
      {plan.featured && (
        <div className="border-b border-line bg-white/[0.04] px-5 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-300">
          Most Popular
        </div>
      )}
      {plan.image && (
        <div className="h-32 overflow-hidden border-b border-line bg-ink-850">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plan.image} alt="" className="h-full w-full object-cover opacity-60" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-white">{plan.name}</h3>
            {plan.shortDescription && <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{plan.shortDescription}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {!plan.active && <span className="badge-zinc">Unpublished</span>}
            {!plan.inStock && <span className="badge-rose">Out of stock</span>}
          </div>
        </div>

        <div className="my-5 grid grid-cols-2 gap-x-3 gap-y-3 border-y border-line py-5">
          {specs.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5">
              <Icon size={14} className="mt-0.5 shrink-0 text-neutral-600" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-neutral-600">{label}</div>
                <div className="truncate text-xs font-medium text-neutral-300">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {plan.features.length > 0 && (
          <ul className="mb-6 flex-1 space-y-2.5">
            {plan.features.map((feature) => (
              <li key={feature.id} className="flex items-start gap-2.5 text-xs text-neutral-400">
                <Check size={13} className="mt-0.5 shrink-0 text-neutral-500" />
                {feature.text}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto border-t border-line pt-5">
          <div className="mb-4 flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight text-white">{formatMoney(plan.priceCents, currency, symbol)}</span>
            <span className="text-xs text-neutral-500">/ {plan.billingPeriod === "monthly" ? "month" : plan.billingPeriod}</span>
          </div>
          {plan.active && plan.inStock ? (
            <Link href={plan.orderUrl || `/order/${plan.slug}`} className="btn-primary w-full">
              Order Now <ArrowUpRight size={14} />
            </Link>
          ) : (
            <button className="btn-secondary w-full" disabled>
              {!plan.inStock ? "Out of stock" : "Unavailable"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
