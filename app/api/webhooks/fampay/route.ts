import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settleInvoice } from "@/lib/billing";
import { verifyFamGatewayWebhook } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-famgateway-signature") || "";
  if (!(await verifyFamGatewayWebhook(raw, signature))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }
  if (event?.event !== "payment.success" && event?.status !== "success") {
    return NextResponse.json({ received: true });
  }

  const orderId = String(event?.order_id || "");
  if (!orderId) return NextResponse.json({ received: true });

  const tx = await prisma.transaction.findFirst({
    where: { gateway: "fampay", gatewayRef: orderId },
    include: { invoice: true },
  });
  if (!tx || !tx.invoice || tx.status === "SUCCESS") return NextResponse.json({ received: true });

  const paidAmount = Number(event?.payable_amount ?? event?.amount ?? tx.amountCents / 100);
  if (Math.abs(paidAmount * 100 - tx.amountCents) > 1) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  await settleInvoice({
    invoiceId: tx.invoice.id,
    gateway: "fampay",
    amountCents: tx.amountCents,
    transactionId: tx.transactionId,
    paymentMethod: "FamGateway UPI",
    gatewayRef: event?.utr || event?.transaction_id || orderId,
    note: `FamGateway webhook · UTR ${event?.utr || "—"}`,
  });
  return NextResponse.json({ received: true, status: "processed" });
}
