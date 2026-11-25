import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { TicketCreate } from "@/components/ticket-create";
import { ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await requireUser();
  const [tickets, departments] = await Promise.all([
    prisma.supportTicket.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { _count: { select: { messages: true } } } }),
    getSetting<string[]>("supportDepartments", ["General", "Billing", "Technical", "Sales"]),
  ]);
  return (
    <>
      <PageHeader title="Support" description="Create and follow up on support tickets." action={<TicketCreate departments={departments} />} />
      {tickets.length ? (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Ticket</th><th>Subject</th><th>Department</th><th>Status</th><th>Messages</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs text-neutral-400">{t.ticketNumber}</td>
                    <td className="font-medium text-white">{t.subject}</td>
                    <td className="text-xs">{t.department}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-xs">{t._count.messages}</td>
                    <td className="text-xs">{formatDate(t.updatedAt)}</td>
                    <td><Link href={`/client/support/${t.id}`} className="btn-ghost px-2"><ArrowUpRight size={15} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <EmptyState title="No tickets yet" description="Open a ticket if you need help with your services or billing." />}
    </>
  );
}
