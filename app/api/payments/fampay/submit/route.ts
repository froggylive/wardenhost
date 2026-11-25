import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/crypto";
import { isGatewayEnabled } from "@/lib/payments";
import { checkoutSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await isGatewayEnabled("fampay"))) {
    return NextResponse.json({ error: "FamPay UPI QR is not configured" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: parsed.data.invoiceId, userId: user.id },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "UNPAID") return NextResponse.json({ error: "Invoice is not awaiting payment" }, { status: 400 });

  const reference = parsed.data.reference?.trim();
  if (!reference) return NextResponse.json({ error: "UPI transaction reference is required" }, { status: 400 });

  // Prevent duplicate submissions for the same reference/invoice.
  const existing = await prisma.transaction.findFirst({
    where: {
      gateway: "fampay",
      invoiceId: invoice.id,
      gatewayRef: reference,
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
  });
  if (existing) {
    return NextResponse.json({ ok: true, message: "This payment reference was already submitted and is awaiting verification." });
  }

  const transactionId = `FAM-${randomToken(8).toUpperCase()}`;
  await prisma.transaction.create({
    data: {
      transactionId,
      userId: user.id,
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      gateway: "fampay",
      paymentMethod: "FamPay UPI",
      amountCents: invoice.totalCents,
      currency: invoice.currency,
      status: "PENDING",
      gatewayRef: reference,
      note: parsed.data.note || null,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Payment submitted. Your invoice will be marked paid after an administrator verifies the UPI reference.",
  });
}
