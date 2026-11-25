import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRazorpayOrder, isGatewayEnabled } from "@/lib/payments";
import { randomToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await isGatewayEnabled("razorpay"))) return NextResponse.json({ error: "Razorpay is not enabled" }, { status: 400 });

  const { invoiceId } = await request.json();
  const invoice = await prisma.invoice.findFirst({ where: { id: String(invoiceId || ""), userId: user.id } });
  if (!invoice || invoice.status !== "UNPAID") return NextResponse.json({ error: "Invoice is not payable" }, { status: 404 });

  const existing = await prisma.transaction.findFirst({
    where: { invoiceId: invoice.id, gateway: "razorpay", status: "PENDING", createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
  });
  if (existing?.gatewayRef) {
    return NextResponse.json({ orderId: existing.gatewayRef, keyId: process.env.RAZORPAY_KEY_ID, amount: invoice.totalCents, currency: invoice.currency });
  }

  try {
    const order = await createRazorpayOrder(invoice.totalCents, `INV-${invoice.invoiceNumber}-${randomToken(4)}`);
    await prisma.transaction.create({
      data: {
        transactionId: `RZP-${randomToken(8).toUpperCase()}`,
        userId: user.id,
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        gateway: "razorpay",
        amountCents: invoice.totalCents,
        currency: invoice.currency,
        status: "PENDING",
        gatewayRef: order.id,
      },
    });
    return NextResponse.json({ orderId: order.id, keyId: order.keyId, amount: invoice.totalCents, currency: invoice.currency });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to start payment" }, { status: 502 });
  }
}
