import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settleInvoice } from "@/lib/billing";
import { verifyRazorpayWebhook } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  if (!(await verifyRazorpayWebhook(raw, signature))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }

  if (payload.event !== "payment.captured" && payload.event !== "order.paid") {
    return NextResponse.json({ received: true });
  }

  const payment = payload?.payload?.payment?.entity;
  const orderId = payment?.order_id || payload?.payload?.order?.entity?.id;
  const paymentId = payment?.id;
  if (!orderId) return NextResponse.json({ received: true });

  const tx = await prisma.transaction.findFirst({ where: { gatewayRef: orderId, gateway: "razorpay" }, include: { invoice: true } });
  if (!tx || !tx.invoice || tx.status === "SUCCESS") return NextResponse.json({ received: true });

  await settleInvoice({
    invoiceId: tx.invoice.id,
    gateway: "razorpay",
    amountCents: tx.amountCents,
    transactionId: tx.transactionId,
    paymentMethod: "Razorpay",
    gatewayRef: paymentId || orderId,
  });
  return NextResponse.json({ received: true });
}
