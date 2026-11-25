"use server";

import { redirect } from "next/navigation";
import { getAuthUser, requireAdmin, audit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueNumber } from "@/lib/billing";
import { saveUpload } from "@/lib/upload";
import { ticketSchema, ticketReplySchema } from "@/lib/validation";

export async function createTicketAction(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Please sign in" };
  const parsed = ticketSchema.safeParse({
    department: String(formData.get("department") || ""),
    subject: String(formData.get("subject") || ""),
    message: String(formData.get("message") || ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const file = formData.get("attachment");
  let attachmentPath: string | undefined;
  let attachmentName: string | undefined;
  if (file instanceof File && file.size > 0) {
    const saved = await saveUpload(file, "attachment");
    if (!saved.ok) return { error: saved.error };
    attachmentPath = saved.url;
    attachmentName = saved.name;
  }

  const ticketNumber = await uniqueNumber("TKT", "ticket");
  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber,
      userId: user.id,
      department: parsed.data.department,
      subject: parsed.data.subject,
      status: "OPEN",
      priority: "NORMAL",
      messages: {
        create: {
          authorId: user.id,
          authorName: user.name,
          isAdmin: false,
          message: parsed.data.message,
          attachmentPath,
          attachmentName,
        },
      },
    },
  });
  redirect(`/client/support/${ticket.id}`);
}

export async function customerReplyAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const user = await getAuthUser();
  if (!user) return { error: "Please sign in" };
  const ticketId = String(formData.get("ticketId") || "");
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, userId: user.id } });
  if (!ticket) return { error: "Ticket not found" };
  if (ticket.status === "CLOSED") return { error: "This ticket is closed" };

  const parsed = ticketReplySchema.safeParse({ message: String(formData.get("message") || "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.ticketMessage.create({
    data: { ticketId, authorId: user.id, authorName: user.name, message: parsed.data.message },
  });
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "IN_PROGRESS" } });
  return { success: true };
}

export async function closeTicketAction(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Please sign in" };
  const ticketId = String(formData.get("ticketId") || "");
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, userId: user.id } });
  if (!ticket) return { error: "Ticket not found" };
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });
  redirect("/client/support");
}

export async function adminTicketAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin();
  const ticketId = String(formData.get("ticketId") || "");
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "Ticket not found" };

  const message = String(formData.get("message") || "");
  const status = String(formData.get("status") || ticket.status);
  const department = String(formData.get("department") || ticket.department);
  const isInternal = formData.get("isInternal") === "on";

  if (message.trim()) {
    await prisma.ticketMessage.create({
      data: {
        ticketId, authorId: admin.id, authorName: admin.name, isAdmin: true, isInternal, message,
      },
    });
  }
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status, department } });
  await audit(admin.id, "UPDATE", "SupportTicket", ticketId, `Status: ${status}, Department: ${department}`);
  return { success: true };
}
