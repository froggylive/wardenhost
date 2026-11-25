import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getIcon } from "@/lib/icons";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { PlanCard } from "@/components/plan-card";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const [settings, allCategories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true, icon: true } }),
  ]);
  const category = await prisma.category.findFirst({
    where: { slug: params.slug, active: true },
    include: { plans: { where: { active: true }, orderBy: { displayOrder: "asc" }, include: { features: { orderBy: { displayOrder: "asc" } } } } },
  });
  if (!category) notFound();

  const Icon = getIcon(category.icon);

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNavbar companyName={settings.companyName} logoText={settings.logoText} logo={settings.logo} categories={allCategories} />
      <main className="container-x py-12 lg:py-16">
        <Link href="/#hosting" className="btn-ghost mb-8 -ml-2 text-xs"><ArrowLeft size={14} /> All hosting services</Link>
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
          <div>
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-ink-900 text-neutral-300"><Icon size={21} /></div>
              <div>
                <div className="section-eyebrow">Hosting Service</div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{category.name}</h1>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">{category.description}</p>
            {category.image && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={category.image} alt="" className="aspect-[3/1] w-full object-cover opacity-70" />
              </div>
            )}
            <div className="mt-10">
              <h2 className="mb-5 text-lg font-semibold text-white">Available plans</h2>
              {category.plans.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {category.plans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} symbol={settings.currencySymbol || "₹"} currency={plan.currency} />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-neutral-500">No active plans in this category.</p>
              )}
            </div>
          </div>
          <aside className="panel sticky top-24 p-5">
            <h3 className="text-sm font-medium text-white">Included with every plan</h3>
            <ul className="mt-4 space-y-3 text-xs text-neutral-400">
              {["Clean, isolated environment", "Full control where applicable", "On-demand infrastructure support", "Transparent billing"].map((item) => (
                <li key={item} className="flex gap-2"><Check size={13} className="mt-0.5 shrink-0 text-neutral-500" />{item}</li>
              ))}
            </ul>
            <Link href="/order" className="btn-primary mt-6 w-full">Start an order <ArrowUpRight size={14} /></Link>
          </aside>
        </div>
      </main>
      <SiteFooter settings={settings} categories={allCategories} />
    </div>
  );
}
