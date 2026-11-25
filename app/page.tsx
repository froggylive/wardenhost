import Link from "next/link";
import { ArrowUpRight, ArrowRight, ShieldCheck, Gauge, ServerCog, Headphones } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getIcon } from "@/lib/icons";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { InfrastructureCard } from "@/components/infrastructure-card";
import { SectionTitle } from "@/components/ui";
import { parseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, categories, announcement] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    prisma.announcement.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const nodes = parseJson<Array<{ name: string; host: string }>>(JSON.stringify(settings.testNodes || []), []);
  const headline = String(settings.heroHeadline || "Infrastructure\nBuilt to Perform.");
  const bannerText = String(settings.announcement || "").trim();
  const bannerLink = String(settings.announcementLink || "").trim();

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNavbar
        companyName={settings.companyName || "WardenHost"}
        logoText={settings.logoText || "WH"}
        logo={settings.logo}
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon }))}
      />

      {(bannerText || announcement) && (
        <div className="border-b border-line bg-white/[0.03]">
          <div className="container-x flex flex-wrap items-center justify-center gap-2 py-2.5 text-center text-xs text-neutral-400">
            <span className="badge-emerald">Announcement</span>
            <span className="font-medium text-neutral-200">{bannerText || announcement?.title}</span>
            {!bannerText && <span className="hidden sm:inline">— {announcement?.message}</span>}
            {bannerLink && <a href={bannerLink} className="text-neutral-300 underline">Learn more</a>}
          </div>
        </div>
      )}

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[700px] -translate-x-1/2 rounded-full bg-white/[0.035] blur-[120px]" />
          <div className="container-x relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
            <div className="animate-fade-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-ink-900/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {settings.heroEyebrow || "Premium Hosting Infrastructure"}
              </div>
              <h1 className="whitespace-pre-line text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl lg:text-[64px]">
                {headline}
              </h1>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-neutral-400 sm:text-base">
                {settings.heroDescription}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="#hosting" className="btn-primary">Explore Hosting <ArrowRight size={15} /></Link>
                <Link href="/order" className="btn-secondary">Order Now <ArrowUpRight size={15} /></Link>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-6 text-xs text-neutral-500">
                <span><strong className="font-semibold text-neutral-200">NVMe</strong> storage standard</span>
                <span><strong className="font-semibold text-neutral-200">DDoS</strong> mitigation available</span>
                <span><strong className="font-semibold text-neutral-200">24/7</strong> technical support</span>
              </div>
            </div>
            <div className="relative animate-fade-up [animation-delay:150ms]">
              <div className="overflow-hidden rounded-2xl border border-line bg-ink-900 shadow-2xl shadow-black/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.heroImage || "/images/hero-server-rack.jpg"}
                  alt="Black and white photograph of server racks in a data center"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>
          </div>
          <div className="container-x relative pb-14">
            <InfrastructureCard nodes={nodes} locations={settings.networkLocations || ""} />
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b border-line">
          <div className="container-x grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ServerCog, title: "Dedicated resources", text: "No noisy neighbours. Predictable compute." },
              { icon: Gauge, title: "NVMe performance", text: "Low-latency storage on every node." },
              { icon: ShieldCheck, title: "Network protection", text: "DDoS mitigation where provided." },
              { icon: Headphones, title: "Real support", text: "Engineers who understand infrastructure." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-ink-950 px-6 py-8">
                <Icon size={18} className="mb-4 text-neutral-500" />
                <h3 className="text-sm font-medium text-neutral-200">{title}</h3>
                <p className="mt-1 text-xs text-neutral-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About / infrastructure */}
        <section className="border-b border-line">
          <div className="container-x grid items-center gap-10 py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
            <div className="overflow-hidden rounded-2xl border border-line bg-ink-900 shadow-2xl shadow-black/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/about-server-blade.jpg"
                alt="Black and white photograph of server blade hardware"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div>
              <div className="section-eyebrow">About our infrastructure</div>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                Built around real hardware, not marketing claims.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-neutral-400">
                Every node in our fleet is selected for predictable performance: enterprise processors,
                NVMe storage and clean networking. We keep the stack simple so your workloads get the
                resources they are paying for.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-neutral-500">
                Choose a compute environment, pick a plan, and manage everything from one client area —
                with transparent billing and support from engineers who understand infrastructure.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/plans" className="btn-primary">View all plans <ArrowRight size={15} /></Link>
                <Link href="/network" className="btn-secondary">Network & status</Link>
              </div>
              <p className="mt-6 text-[10px] text-neutral-700">
                Hardware photograph: <a href="https://commons.wikimedia.org/wiki/File:CiscoUCS.JPG" target="_blank" rel="noreferrer" className="underline hover:text-neutral-500">Raysonho</a>, CC BY-SA 3.0 (converted to monochrome).
              </p>
            </div>
          </div>
        </section>

        {/* Hosting categories — introductions only, no plans on the homepage */}
        <section id="hosting" className="container-x py-20 lg:py-28">
          <SectionTitle
            eyebrow="Hosting Services"
            title="Specialized Compute Environments"
            description="Every workload is different. Choose the environment built for yours. Open a category to see its plans, specifications and pricing."
          />
          {categories.length === 0 ? (
            <p className="text-sm text-neutral-500">No hosting categories have been published yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => {
                const Icon = getIcon(category.icon);
                return (
                  <article key={category.id} className="panel panel-hover flex flex-col p-6">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink-850 text-neutral-300">
                      <Icon size={19} />
                    </div>
                    {category.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={category.image} alt="" className="mb-5 aspect-[3/1] w-full rounded-lg border border-line object-cover opacity-70" />
                    )}
                    <h3 className="text-lg font-semibold tracking-tight text-white">{category.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">{category.description}</p>
                    <Link href={`/plans/${category.slug}`} className="btn-secondary mt-6 w-full justify-between">
                      View Plans <ArrowRight size={15} />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
          <div className="mt-10 text-center">
            <Link href="/plans" className="btn-ghost text-xs">Browse all plans <ArrowRight size={14} /></Link>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-line">
          <div className="container-x py-20 text-center">
            <div className="section-eyebrow">Ready when you are</div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Deploy on infrastructure you can trust.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-neutral-500">
              Pick a plan, configure billing, and get access to your client area in minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/order" className="btn-primary">Order Now <ArrowUpRight size={15} /></Link>
              <Link href="/register" className="btn-secondary">Create an account</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter settings={settings} categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))} />
    </div>
  );
}
