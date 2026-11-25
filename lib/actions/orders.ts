"use server";

import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/billing";
import { orderSchema } from "@/lib/validation";

export async function customerCancelOrderAction(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Please sign in" };
  const id = String(formData.get("id") || "");
  const order = await prisma.order.findFirst({ where: { id, userId: user.id } });
  if (!order) return { error: "Order not found" };
  if (!["PENDING", "AWAITING_PAYMENT", "PROCESSING"].includes(order.status)) {
    return { error: "This order can no longer be cancelled" };
  }
  await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
  await prisma.invoice.updateMany({ where: { orderId: id, status: "UNPAID" }, data: { status: "CANCELLED" } });
  redirect("/client/orders");
}

export async function createOrderAction(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Please sign in to place an order." };

  const parsed = orderSchema.safeParse({
    planId: String(formData.get("planId") || ""),
    billingPeriodId: String(formData.get("billingPeriodId") || ""),
    cpuOptionId: String(formData.get("cpuOptionId") || ""),
    couponCode: String(formData.get("couponCode") || ""),
  });
  if (!parsed.success) return { error: "Please complete all required fields." };

  try {
    const order = await createOrder({ ...parsed.data, userId: user.id });
    const invoice = await prisma.invoice.findFirst({ where: { orderId: order.id } });
    if (invoice) redirect(`/client/invoices/${invoice.id}`);
    redirect(`/client/orders/${order.id}`);
  } catch (error: any) {
    // Next.js implements redirect() by throwing; never swallow that signal.
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") throw error;
    return { error: error?.message || "Unable to create the order." };
  }
}
