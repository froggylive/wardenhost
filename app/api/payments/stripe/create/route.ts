import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStripeCheckout, isGatewayEnabled } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await isGatewayEnabled("stripe"))) return NextResponse.json({ error: "Stripe is not enabled" }, { status: 400 });
  const { invoiceId } = await request.json();
  const invoice = await prisma.invoice.findFirst({ where: { id: String(invoiceId || ""), userId: user.id } });
  if (!invoice || invoice.status !== "UNPAID") return NextResponse.json({ error: "Invoice is not payable" }, { status: 404 });
  const base = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
  try {
    const session = await createStripeCheckout({
      amountCents: invoice.totalCents,
      currency: invoice.currency,
      description: `${invoice.invoiceNumber} — ${invoice.planName}`,
      invoiceId: invoice.id,
      successUrl: `${base}/client/invoices/${invoice.id}?stripe=success`,
      cancelUrl: `${base}/client/invoices/${invoice.id}?stripe=cancelled`,
    });
    await prisma.transaction.create({
      data: {
        transactionId: `STP-${session.id.slice(-16).toUpperCase()}`,
        userId: user.id,
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        gateway: "stripe",
        amountCents: invoice.totalCents,
        currency: invoice.currency,
        status: "PENDING",
        gatewayRef: session.id,
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to start checkout" }, { status: 502 });
  }
}
