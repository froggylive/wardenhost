import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { retrieveStripeSession } from "@/lib/payments";
import { settleInvoice } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { invoiceId, sessionId } = await request.json();
  const invoice = await prisma.invoice.findFirst({ where: { id: String(invoiceId || ""), userId: user.id } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  try {
    const session = await retrieveStripeSession(String(sessionId || ""));
    if (session.client_reference_id !== invoice.id || session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment was not completed for this invoice" }, { status: 400 });
    }
    const tx = await prisma.transaction.findFirst({ where: { gatewayRef: session.id, invoiceId: invoice.id } });
    if (!tx) return NextResponse.json({ error: "Payment record not found" }, { status: 400 });
    await settleInvoice({
      invoiceId: invoice.id,
      gateway: "stripe",
      amountCents: Number(session.amount_total),
      transactionId: tx.transactionId,
      paymentMethod: "Stripe Card",
      gatewayRef: session.payment_intent || session.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Confirmation failed" }, { status: 502 });
  }
}
