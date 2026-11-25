import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [settings, pendingOrders, openTickets] = await Promise.all([
    getSettings(),
    prisma.order.count({ where: { status: { in: ["PENDING", "AWAITING_PAYMENT"] } } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  return (
    <DashboardShell
      companyName={settings.companyName || "WardenHost"}
      logoText={settings.logoText || "WH"}
      logo={settings.logo}
      creditName={settings.creditName}
      creditUrl={settings.creditUrl}
      user={admin}
      adminArea
      nav={[
        { items: [
          { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
          { href: "/admin/categories", label: "Categories", icon: "Layers" },
          { href: "/admin/plans", label: "Plans", icon: "Server" },
          { href: "/admin/cpu", label: "CPU Options", icon: "Cpu" },
          { href: "/admin/panels", label: "Provisioning Panels", icon: "ServerCog" },
          { href: "/admin/orders", label: "Orders", icon: "ShoppingBag", badge: pendingOrders ? String(pendingOrders) : undefined },
          { href: "/admin/billing", label: "Billing", icon: "Receipt" },
        ] },
        { label: "Management", items: [
          { href: "/admin/customers", label: "Customers", icon: "Users" },
          { href: "/admin/coupons", label: "Coupons", icon: "Percent" },
          { href: "/admin/tickets", label: "Support Tickets", icon: "LifeBuoy", badge: openTickets ? String(openTickets) : undefined },
          { href: "/admin/content", label: "Website Content", icon: "FileText" },
          { href: "/admin/settings", label: "Settings", icon: "Settings" },
          { href: "/admin/activity", label: "Activity Log", icon: "ScrollText" },
          { href: "/client/profile", label: "Profile & Security", icon: "UserRound" },
        ] },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
