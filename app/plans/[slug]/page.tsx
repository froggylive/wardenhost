import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getIcon } from "@/lib/icons";
import { formatMoney } from "@/lib/utils";
import { getCpuOptionsForCategory } from "@/lib/cpu-pricing";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { PlanCard } from "@/components/plan-card";

export const dynamic = "force-dynamic";

export default async function PlanCategoryPage({ params }: { params: { slug: string } }) {
  const [settings, allCategories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, icon: true },
    }),
  ]);

  // Disabled categories and their plans must never be visible publicly.
  const category = await prisma.category.findFirst({
    where: { slug: params.slug, active: true },
    include: {
      plans: {
        where: { active: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: { features: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  if (!category) notFound();
  const cpuOptions = await getCpuOptionsForCategory(category.id);

  const Icon = getIcon(category.icon);
  const symbol = settings.currencySymbol || "₹";

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNavbar
        companyName={settings.companyName || "WardenHost"}
        logoText={settings.logoText || "WH"}
        logo={settings.logo}
        categories={allCategories}
      />
      <main className="container-x py-12 lg:py-16">
        <Link href="/plans" className="btn-ghost mb-8 -ml-2 text-xs"><ArrowLeft size={14} /> All plans</Link>

        <div className="mb-10 flex items-start gap-5 border-b border-line pb-10">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-ink-900 text-neutral-300">
            <Icon size={24} />
          </div>
          <div>
            <div className="section-eyebrow">Hosting category</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{category.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">{category.description}</p>
          </div>
        </div>

        {category.image && (
          <div className="mb-10 overflow-hidden rounded-2xl border border-line bg-ink-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={category.image} alt="" className="aspect-[3/1] w-full object-cover opacity-75" />
          </div>
        )}

        <div className="mb-6 flex items-center gap-2 text-xs text-neutral-500">
          <Layers size={14} /> {category.plans.length} available plan{category.plans.length === 1 ? "" : "s"}
        </div>

        {category.plans.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {category.plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} symbol={symbol} currency={plan.currency} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
            <p className="text-sm text-neutral-400">No active plans in this category yet.</p>
            <p className="mt-2 text-xs text-neutral-600">Publish a plan for this category in the admin panel to see it here.</p>
          </div>
        )}

        {cpuOptions.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-lg font-semibold text-white">Available CPU upgrades</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {cpuOptions.map((cpu) => (
                <div key={cpu.id} className="panel p-4">
                  <p className="text-xs font-medium text-neutral-200">{cpu.name}</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {cpu.priceCents > 0 ? `+${formatMoney(cpu.priceCents, "INR", symbol)}` : "Free"}
                  </p>
                  <p className="mt-1 text-[10px] text-neutral-600">Select at checkout</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="panel mt-12 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-medium text-white">Included with this environment</h2>
            <ul className="mt-3 grid gap-2 text-xs text-neutral-400 sm:grid-cols-2">
              {["Isolated resources", "Configurable specifications", "Transparent billing cycles", "Client area management"].map((item) => (
                <li key={item} className="flex gap-2"><Check size={13} className="mt-0.5 shrink-0 text-neutral-600" />{item}</li>
              ))}
            </ul>
          </div>
          <Link href="/order" className="btn-primary shrink-0">Order any plan</Link>
        </div>
      </main>
      <SiteFooter settings={settings} categories={allCategories} />
    </div>
  );
}
