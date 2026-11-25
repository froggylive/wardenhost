import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [settings, pendingOrders, unpaidInvoices, openTickets] = await Promise.all([
    getSettings(),
    prisma.order.count({ where: { userId: user.id, status: { in: ["PENDING", "AWAITING_PAYMENT", "PROCESSING"] } } }),
    prisma.invoice.count({ where: { userId: user.id, status: "UNPAID" } }),
    prisma.supportTicket.count({ where: { userId: user.id, status: { in: ["OPEN", "IN_PROGRESS", "AWAITING_CUSTOMER"] } } }),
  ]);

  return (
    <DashboardShell
      companyName={settings.companyName || "WardenHost"}
      logoText={settings.logoText || "WH"}
      logo={settings.logo}
      creditName={settings.creditName}
      creditUrl={settings.creditUrl}
      user={user}
      nav={[{
        items: [
          { href: "/client", label: "Dashboard", icon: "LayoutDashboard" },
          { href: "/client/services", label: "My Services", icon: "Server" },
          { href: "/client/orders", label: "My Orders", icon: "ShoppingBag", badge: pendingOrders ? String(pendingOrders) : undefined },
          { href: "/client/invoices", label: "Invoices", icon: "FileText", badge: unpaidInvoices ? String(unpaidInvoices) : undefined },
          { href: "/client/transactions", label: "Transactions", icon: "CreditCard" },
          { href: "/client/support", label: "Support", icon: "LifeBuoy", badge: openTickets ? String(openTickets) : undefined },
          { href: "/client/profile", label: "Profile & Security", icon: "UserRound" },
        ],
      }]}
    >
      {children}
    </DashboardShell>
  );
}
