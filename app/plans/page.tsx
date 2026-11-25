import Link from "next/link";
import { ArrowRight, Server } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getIcon } from "@/lib/icons";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { PlanCard } from "@/components/plan-card";
import { SectionTitle, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        plans: {
          where: { active: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          include: { features: { orderBy: { displayOrder: "asc" } } },
        },
      },
    }),
  ]);
  const symbol = settings.currencySymbol || "₹";

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNavbar
        companyName={settings.companyName || "WardenHost"}
        logoText={settings.logoText || "WH"}
        logo={settings.logo}
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon }))}
      />
      <main className="container-x py-14 lg:py-20">
        <SectionTitle
          eyebrow="Hosting Plans"
          title="Compare every hosting plan"
          description="Choose a category to see its plans. Specifications, features and pricing are managed in the admin panel and update here automatically."
        />

        {categories.length === 0 || categories.every((c) => c.plans.length === 0) ? (
          <EmptyState title="No plans published yet" description="Plans will appear here as soon as an administrator publishes them." />
        ) : (
          <div className="space-y-20">
            {categories.map((category) => {
              const Icon = getIcon(category.icon);
              return (
                <section key={category.id} id={category.slug} className="scroll-mt-24">
                  <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-ink-900 text-neutral-300">
                        <Icon size={19} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-white">{category.name}</h2>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-500">{category.description}</p>
                      </div>
                    </div>
                    <Link href={`/plans/${category.slug}`} className="btn-ghost shrink-0 text-xs">
                      Category details <ArrowRight size={14} />
                    </Link>
                  </div>

                  {category.plans.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {category.plans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} symbol={symbol} currency={plan.currency} />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-xs text-neutral-600">
                      No active plans in this category yet.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <div className="mt-16 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-line bg-ink-900 px-6 py-10 text-center">
          <Server size={18} className="text-neutral-500" />
          <p className="text-sm text-neutral-400">Need help choosing? Our team can recommend the right environment.</p>
          <Link href="/client/support" className="btn-secondary">Contact support</Link>
        </div>
      </main>
      <SiteFooter
        settings={settings}
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      />
    </div>
  );
}
