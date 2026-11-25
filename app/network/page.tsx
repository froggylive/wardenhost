import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { parseJson } from "@/lib/utils";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { InfrastructureCard } from "@/components/infrastructure-card";
import { SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ displayOrder: "asc" }], select: { id: true, name: true, slug: true, icon: true } }),
  ]);
  const nodes = parseJson<Array<{ name: string; host: string }>>(JSON.stringify(settings.testNodes || []), []);

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNavbar companyName={settings.companyName} logoText={settings.logoText} logo={settings.logo} categories={categories} />
      <main className="container-x py-16 lg:py-24">
        <SectionTitle eyebrow="Network" title="Infrastructure & Connectivity" description="Latency is measured on request from our infrastructure against the test nodes configured by the administrator. No status is shown unless it is actually measured." />
        <InfrastructureCard nodes={nodes} locations={settings.networkLocations || ""} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="panel p-6">
            <h2 className="text-sm font-medium text-white">How the ping test works</h2>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">When you run a test, our server issues HEAD requests to the configured nodes with a four-second timeout and reports the measured round-trip time. Results are not cached or simulated.</p>
          </div>
          <div className="panel p-6">
            <h2 className="text-sm font-medium text-white">Configured locations</h2>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">{settings.networkLocations || "No locations configured."}</p>
          </div>
        </div>
      </main>
      <SiteFooter settings={settings} categories={categories} />
    </div>
  );
}
