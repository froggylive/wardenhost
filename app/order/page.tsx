import Link from "next/link";
import { ArrowUpRight, Server } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { SectionTitle, EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrderIndexPage() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }],
      include: { plans: { where: { active: true, inStock: true }, orderBy: { displayOrder: "asc" } } },
    }),
  ]);
  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNavbar companyName={settings.companyName} logoText={settings.logoText} logo={settings.logo} categories={categories} />
      <main className="container-x py-16 lg:py-24">
        <SectionTitle eyebrow="Order" title="Choose your infrastructure" description="Select a plan to configure billing and complete checkout." />
        {categories.length === 0 || categories.every((c) => c.plans.length === 0) ? (
          <EmptyState title="No plans available" description="The administrator has not published any plans yet." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {categories.filter((c) => c.plans.length).map((cat) => (
              <div key={cat.id} className="panel p-6">
                <div className="mb-5 flex items-center gap-3"><Server size={17} className="text-neutral-500" /><h2 className="text-base font-semibold text-white">{cat.name}</h2></div>
                <div className="space-y-2">
                  {cat.plans.map((plan) => (
                    <Link key={plan.id} href={`/order/${plan.slug}`} className="flex items-center justify-between rounded-lg border border-line bg-ink-850 px-4 py-3 transition-colors hover:border-neutral-600 hover:bg-ink-800">
                      <div>
                        <p className="text-sm font-medium text-neutral-200">{plan.name}</p>
                        <p className="mt-0.5 text-[11px] text-neutral-600">{plan.ram} · {plan.cpu} · {plan.disk} {plan.storageType}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-white">{formatMoney(plan.priceCents, plan.currency, settings.currencySymbol || "₹")}</span>
                        <ArrowUpRight size={15} className="text-neutral-600" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter settings={settings} categories={categories} />
    </div>
  );
}
