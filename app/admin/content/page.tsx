import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { ContentManager } from "@/components/content-manager";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [settings, announcements, periods] = await Promise.all([
    getSettings(),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.billingPeriod.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Website Content" description="Edit all public-facing text, images, announcements and billing periods without touching code." />
      <ContentManager settings={settings} announcements={announcements} periods={periods} />
    </>
  );
}
