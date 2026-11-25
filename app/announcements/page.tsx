import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { SectionTitle, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const [settings, categories, announcements] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ displayOrder: "asc" }], select: { id: true, name: true, slug: true, icon: true } }),
    prisma.announcement.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="min-h-screen bg-ink-950">
      <SiteNavbar companyName={settings.companyName} logoText={settings.logoText} logo={settings.logo} categories={categories} />
      <main className="container-x py-16 lg:py-24">
        <SectionTitle eyebrow="Updates" title="Announcements" description="Network changes, new locations and platform updates." />
        {announcements.length ? (
          <div className="max-w-3xl space-y-3">
            {announcements.map((a) => (
              <article key={a.id} className="panel p-5">
                <div className="mb-2 text-[11px] text-neutral-600">{formatDateTime(a.createdAt)}</div>
                <h2 className="text-sm font-medium text-white">{a.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{a.message}</p>
              </article>
            ))}
          </div>
        ) : <EmptyState title="No announcements" description="There are no published announcements right now." />}
      </main>
      <SiteFooter settings={settings} categories={categories} />
    </div>
  );
}
