import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, statusTone, prettyStatus } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui";
import { ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status || "ALL";
  const tickets = await prisma.supportTicket.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { name: true, email: true } }, _count: { select: { messages: true } } },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Support Tickets" description="Reply to customers, change status and add internal notes." />
      <form className="mb-5 flex gap-2" method="get">
        <select className="input w-48" name="status" defaultValue={status}>
          {["ALL", "OPEN", "IN_PROGRESS", "AWAITING_CUSTOMER", "CLOSED"].map((s) => <option key={s} value={s}>{prettyStatus(s)}</option>)}
        </select>
        <button className="btn-secondary" type="submit">Filter</button>
      </form>
      {tickets.length ? (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Ticket</th><th>Subject</th><th>Customer</th><th>Department</th><th>Status</th><th>Messages</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{t.ticketNumber}</td>
                    <td className="font-medium text-white">{t.subject}</td>
                    <td><p className="text-xs">{t.user.name}</p><p className="text-[11px] text-neutral-600">{t.user.email}</p></td>
                    <td className="text-xs">{t.department}</td>
                    <td><span className={`badge-${statusTone(t.status)}`}>{prettyStatus(t.status)}</span></td>
                    <td className="text-xs">{t._count.messages}</td>
                    <td className="text-xs">{formatDate(t.updatedAt)}</td>
                    <td><Link href={`/admin/tickets/${t.id}`} className="btn-ghost px-2"><ArrowUpRight size={15} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <EmptyState title="No tickets found" />}
    </>
  );
}
