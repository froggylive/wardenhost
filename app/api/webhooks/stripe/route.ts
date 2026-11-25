import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settleInvoice } from "@/lib/billing";
import { verifyStripeWebhook } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature") || "";
  if (!(await verifyStripeWebhook(raw, signature))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true });
  }

  const session = event.data?.object;
  if (!session?.id || session.payment_status !== "paid") return NextResponse.json({ received: true });

  const tx = await prisma.transaction.findFirst({ where: { gatewayRef: session.id, gateway: "stripe" }, include: { invoice: true } });
  if (!tx || !tx.invoice || tx.status === "SUCCESS") return NextResponse.json({ received: true });

  await settleInvoice({
    invoiceId: tx.invoice.id,
    gateway: "stripe",
    amountCents: Number(session.amount_total || tx.amountCents),
    transactionId: tx.transactionId,
    paymentMethod: "Stripe Card",
    gatewayRef: session.payment_intent || session.id,
  });
  return NextResponse.json({ received: true });
}
