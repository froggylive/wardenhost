import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/ui";
import { AdminTicketReply } from "@/components/admin-ticket-reply";

export const dynamic = "force-dynamic";

export default async function AdminTicketDetailPage({ params }: { params: { id: string } }) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: { user: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();
  return (
    <>
      <Link href="/admin/tickets" className="btn-ghost mb-6 -ml-2 text-xs"><ArrowLeft size={14} /> Back to tickets</Link>
      <PageHeader title={ticket.subject} description={`${ticket.ticketNumber} · ${ticket.user.name} (${ticket.user.email})`} action={<StatusBadge status={ticket.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="panel divide-y divide-line/60">
          {ticket.messages.length === 0 && <p className="p-5 text-xs text-neutral-500">No messages.</p>}
          {ticket.messages.map((m) => (
            <div key={m.id} className="p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-neutral-200">{m.authorName}</span>
                {m.isAdmin && <span className="badge-zinc">Staff</span>}
                {m.isInternal && <span className="badge-amber">Internal note</span>}
                <span className="text-[11px] text-neutral-600">{formatDateTime(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-400">{m.message}</p>
              {m.attachmentPath && <a href={m.attachmentPath} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-neutral-300 underline">{m.attachmentName || "Attachment"}</a>}
            </div>
          ))}
        </div>
        <AdminTicketReply ticketId={ticket.id} status={ticket.status} department={ticket.department} />
      </div>
    </>
  );
}
