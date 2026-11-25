import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatusBadge } from "@/components/ui";
import { TicketThread } from "@/components/ticket-thread";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();
  return (
    <>
      <Link href="/client/support" className="btn-ghost mb-6 -ml-2 text-xs"><ArrowLeft size={14} /> Back to tickets</Link>
      <PageHeader title={ticket.subject} description={`${ticket.ticketNumber} · ${ticket.department}`} action={<StatusBadge status={ticket.status} />} />
      <TicketThread ticketId={ticket.id} messages={ticket.messages} closed={ticket.status === "CLOSED"} />
    </>
  );
}
