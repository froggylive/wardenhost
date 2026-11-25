import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";

export async function LegalPage({ eyebrow, title, contentKey, fallback }: {
  eyebrow: string;
  title: string;
  contentKey: string;
  fallback: string;
}) {
  const [settings, categories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ displayOrder: "asc" }], select: { id: true, name: true, slug: true, icon: true } }),
  ]);
  const text = String(settings[contentKey] || fallback);

  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNavbar
        companyName={settings.companyName || "WardenHost"}
        logoText={settings.logoText || "WH"}
        logo={settings.logo}
        categories={categories}
      />
      <main className="container-x max-w-4xl py-14 lg:py-20">
        <div className="section-eyebrow">{eyebrow}</div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        <div className="panel mt-10 p-6 sm:p-10">
          <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-400">{text}</p>
        </div>
        <p className="mt-6 text-xs text-neutral-600">
          Last updated {new Date().getFullYear()} · {settings.creditName || "FroggyLive"}
        </p>
      </main>
      <SiteFooter settings={settings} categories={categories} />
    </div>
  );
}
