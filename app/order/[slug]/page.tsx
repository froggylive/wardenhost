import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MemoryStick, Cpu, HardDrive, Gauge, Network, Globe } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getAuthUser } from "@/lib/auth";
import { getCpuOptionsForCategory } from "@/lib/cpu-pricing";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { OrderForm } from "@/components/order-form";

export const dynamic = "force-dynamic";

export default async function OrderPlanPage({ params }: { params: { slug: string } }) {
  const [settings, categories, periods, user] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ displayOrder: "asc" }], select: { id: true, name: true, slug: true, icon: true } }),
    prisma.billingPeriod.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
    getAuthUser(),
  ]);
  const plan = await prisma.plan.findFirst({ where: { slug: params.slug, active: true, inStock: true }, include: { category: true, features: { orderBy: { displayOrder: "asc" } } } });
  if (!plan) notFound();
  const cpuOptions = await getCpuOptionsForCategory(plan.categoryId);

  const specs = [
    { icon: MemoryStick, label: "Memory", value: plan.ram },
    { icon: Cpu, label: "CPU", value: plan.cpu },
    { icon: HardDrive, label: "Storage", value: `${plan.disk} ${plan.storageType}` },
    { icon: Gauge, label: "Bandwidth", value: plan.bandwidth },
    { icon: Network, label: "Network", value: plan.networkSpeed },
    { icon: Globe, label: "IPv4", value: `${plan.ipv4Count} address${plan.ipv4Count > 1 ? "es" : ""}` },
  ];

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNavbar companyName={settings.companyName} logoText={settings.logoText} logo={settings.logo} categories={categories} />
      <main className="container-x py-12 lg:py-16">
        <Link href="/order" className="btn-ghost mb-8 -ml-2 text-xs"><ArrowLeft size={14} /> All plans</Link>
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div>
            <div className="section-eyebrow">{plan.category.name}</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{plan.name}</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">{plan.fullDescription || plan.shortDescription}</p>
            <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-line bg-ink-900 p-6 sm:grid-cols-3">
              {specs.map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <Icon size={15} className="mb-2 text-neutral-600" />
                  <div className="text-[10px] uppercase tracking-wider text-neutral-600">{label}</div>
                  <div className="mt-0.5 text-sm font-medium text-neutral-200">{value}</div>
                </div>
              ))}
            </div>
            {plan.features.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-sm font-medium text-white">Included features</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {plan.features.map((f) => <li key={f.id} className="rounded-lg border border-line bg-ink-900 px-3 py-2 text-xs text-neutral-400">{f.text}</li>)}
                </ul>
              </div>
            )}
          </div>
          <div className="lg:sticky lg:top-24">
            <OrderForm
              planId={plan.id}
              basePriceCents={plan.priceCents}
              currency={plan.currency}
              symbol={settings.currencySymbol || "₹"}
              periods={periods}
              cpuOptions={cpuOptions}
              taxCents={Math.max(0, Math.round(Number(settings.orderTax ?? 2) * 100))}
              loggedIn={!!user}
              loginHref={`/login?next=${encodeURIComponent(`/order/${plan.slug}`)}`}
            />
          </div>
        </div>
      </main>
      <SiteFooter settings={settings} categories={categories} />
    </div>
  );
}
