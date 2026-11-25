import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleInvoice } from "@/lib/billing";
import { verifyRazorpayPayment } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json();
  const { invoiceId, orderId, paymentId, signature } = body;

  if (!orderId || !paymentId || !signature || !(await verifyRazorpayPayment(String(orderId), String(paymentId), String(signature)))) {
    return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findFirst({ where: { id: String(invoiceId || ""), userId: user.id } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const tx = await prisma.transaction.findFirst({ where: { gatewayRef: String(orderId), invoiceId: invoice.id } });
  if (!tx || tx.status !== "PENDING") return NextResponse.json({ error: "No pending payment found for this order" }, { status: 400 });

  try {
    await settleInvoice({
      invoiceId: invoice.id,
      gateway: "razorpay",
      amountCents: tx.amountCents,
      transactionId: tx.transactionId,
      paymentMethod: "Razorpay",
      gatewayRef: paymentId,
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Settlement failed" }, { status: 500 });
  }
}
