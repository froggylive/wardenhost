import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { PanelManager } from "@/components/panel-manager";

export const dynamic = "force-dynamic";

export default async function AdminPanelsPage() {
  const panels = await prisma.panelConfig.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader title="Provisioning Panels" description="Connect your Minecraft, VPS, VDS or other panels. Map a panel to a category, and verified payments will create instances automatically." />
      <PanelManager panels={panels} />
      <div className="panel mt-6 p-5 text-xs leading-relaxed text-neutral-500">
        <p><strong className="text-neutral-300">How it works:</strong> after verified payment, a POST request is sent to your panel URL with <code className="font-mono">action: &quot;create&quot;</code> plus service specs. Store the returned server ID to enable automatic deletion.</p>
        <p className="mt-2">When a service expires it is emailed once, then after 3 unpaid days the panel receives <code className="font-mono">action: &quot;delete&quot;</code> and the service is marked deleted.</p>
      </div>
    </>
  );
}
