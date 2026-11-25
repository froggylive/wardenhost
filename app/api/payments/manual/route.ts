import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validation";
import { randomToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({ where: { id: parsed.data.invoiceId, userId: user.id } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "UNPAID") return NextResponse.json({ error: "Invoice is not awaiting payment" }, { status: 400 });

  const reference = parsed.data.reference?.trim();
  if (!reference) return NextResponse.json({ error: "Payment reference is required" }, { status: 400 });

  const transactionId = `MAN-${randomToken(8).toUpperCase()}`;
  await prisma.transaction.create({
    data: {
      transactionId,
      userId: user.id,
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      gateway: "manual",
      paymentMethod: "Bank Transfer / UPI",
      amountCents: invoice.totalCents,
      currency: invoice.currency,
      status: "PENDING",
      gatewayRef: reference,
      note: parsed.data.note || null,
    },
  });
  return NextResponse.json({ ok: true, message: "Payment submitted for verification. Your invoice will update once an administrator verifies it." });
}
