"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, audit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleInvoice } from "@/lib/billing";

/** Void wrappers for progressive-enhancement <form action> usage. */
export async function updateOrderFormAction(formData: FormData) {
  await updateOrderAction(formData);
}

export async function cancelOrderFormAction(formData: FormData) {
  await cancelOrderAction(formData);
}

export async function updateInvoiceStatusFormAction(formData: FormData) {
  await updateInvoiceStatusAction(formData);
}

export async function updateOrderAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const notes = String(formData.get("notes") || "");
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return { error: "Order not found" };
  await prisma.order.update({ where: { id }, data: { status, notes: notes || null } });
  await audit(admin.id, "UPDATE", "Order", id, `Status: ${status}${notes ? `, Notes updated` : ""}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/client/orders/${id}`);
  return { ok: true };
}

export async function cancelOrderAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return { error: "Order not found" };
  await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
  await prisma.invoice.updateMany({ where: { orderId: id, status: "UNPAID" }, data: { status: "CANCELLED" } });
  await audit(admin.id, "CANCEL", "Order", id, order.orderNumber);
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function verifyManualPaymentAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const transactionId = String(formData.get("transactionId") || "");
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId }, include: { invoice: true } });
  if (!tx) return { error: "Transaction not found" };
  if (tx.status === "SUCCESS") return { error: "This payment has already been verified" };
  if (!tx.invoice) return { error: "Transaction has no invoice" };

  await settleInvoice({
    invoiceId: tx.invoice.id,
    gateway: tx.gateway || "manual",
    amountCents: tx.amountCents,
    transactionId: tx.transactionId,
    paymentMethod: tx.paymentMethod || (tx.gateway === "fampay" ? "FamPay UPI" : "Manual"),
    gatewayRef: tx.gatewayRef || undefined,
    note: `Verified by ${admin.name}`,
  });
  await prisma.transaction.update({ where: { id: tx.id }, data: { status: "SUCCESS", verifiedAt: new Date() } });
  await audit(admin.id, "VERIFY_PAYMENT", "Transaction", tx.id, `${tx.transactionId} verified for ${tx.invoice.invoiceNumber}`);
  revalidatePath("/admin/billing");
  revalidatePath(`/client/invoices/${tx.invoice.id}`);
  return { ok: true };
}

export async function failPaymentAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const transactionId = String(formData.get("transactionId") || "");
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!tx) return { error: "Transaction not found" };
  await prisma.transaction.update({ where: { id: tx.id }, data: { status: "FAILED" } });
  await audit(admin.id, "FAIL_PAYMENT", "Transaction", tx.id, tx.transactionId);
  revalidatePath("/admin/billing");
  return { ok: true };
}

export async function refundPaymentAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const transactionId = String(formData.get("transactionId") || "");
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId }, include: { invoice: true } });
  if (!tx || tx.status !== "SUCCESS") return { error: "Only successful payments can be refunded" };
  await prisma.$transaction([
    prisma.transaction.update({ where: { id: tx.id }, data: { status: "REFUNDED" } }),
    prisma.transaction.create({
      data: {
        transactionId: `REF-${Date.now().toString(36).toUpperCase()}`,
        userId: tx.userId,
        invoiceId: tx.invoiceId,
        orderId: tx.orderId,
        gateway: tx.gateway,
        paymentMethod: tx.paymentMethod,
        amountCents: -tx.amountCents,
        currency: tx.currency,
        status: "REFUNDED",
        note: `Refund recorded by ${admin.name}`,
        verifiedAt: new Date(),
      },
    }),
  ]);
  if (tx.invoice) {
    await prisma.invoice.update({ where: { id: tx.invoice.id }, data: { status: "REFUNDED" } });
    if (tx.invoice.orderId) await prisma.order.update({ where: { id: tx.invoice.orderId }, data: { paymentStatus: "REFUNDED" } });
  }
  await audit(admin.id, "REFUND", "Transaction", tx.id, tx.transactionId);
  revalidatePath("/admin/billing");
  return { ok: true };
}

export async function updateInvoiceStatusAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { error: "Invoice not found" };
  await prisma.invoice.update({ where: { id }, data: { status } });
  await audit(admin.id, "UPDATE", "Invoice", id, `Status: ${status}`);
  revalidatePath("/admin/billing");
  return { ok: true };
}

export async function createManualInvoiceAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  if (!userId || !description || amount <= 0) return { error: "Customer, description and amount are required" };
  const settings = await prisma.websiteSetting.findMany({ where: { key: { in: ["invoicePrefix", "currency", "currencySymbol"] } } });
  const map = Object.fromEntries(settings.map((s) => [s.key, JSON.parse(s.value)]));
  const { uniqueNumber } = await import("@/lib/billing");
  const invoiceNumber = await uniqueNumber(map.invoicePrefix || "INV", "invoice");
  const cents = Math.round(amount * 100);
  await prisma.invoice.create({
    data: {
      invoiceNumber,
      userId,
      subtotalCents: cents,
      totalCents: cents,
      currency: map.currency || "INR",
      status: "UNPAID",
      planName: description,
      billingLabel: "One-time",
      dueDate: new Date(Date.now() + 7 * 86400000),
      items: { create: { description, quantity: 1, unitPriceCents: cents, amountCents: cents } },
    },
  });
  await audit(admin.id, "CREATE", "Invoice", undefined, `${invoiceNumber} for ${userId}`);
  revalidatePath("/admin/billing");
  return { ok: true };
}
