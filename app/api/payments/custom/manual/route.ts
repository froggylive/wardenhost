import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/crypto";
import { getCustomGatewayConfig } from "@/lib/custom-gateways";
import { isGatewayEnabled } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "");
  if (!code.startsWith("custom_")) return NextResponse.json({ error: "Invalid gateway" }, { status: 400 });
  if (!(await isGatewayEnabled(code))) return NextResponse.json({ error: "Gateway is not available" }, { status: 400 });
  const config = (await getCustomGatewayConfig(code))!;

  const invoice = await prisma.invoice.findFirst({ where: { id: String(body.invoiceId || ""), userId: user.id } });
  if (!invoice || invoice.status !== "UNPAID") return NextResponse.json({ error: "Invoice is not payable" }, { status: 404 });
  const reference = String(body.reference || "").trim();
  if (!reference) return NextResponse.json({ error: "Payment reference is required" }, { status: 400 });

  const existing = await prisma.transaction.findFirst({
    where: { gateway: code, invoiceId: invoice.id, gatewayRef: reference, createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
  });
  if (existing) return NextResponse.json({ ok: true, message: "Already submitted and awaiting verification." });

  await prisma.transaction.create({
    data: {
      transactionId: `CUS-${randomToken(8).toUpperCase()}`,
      userId: user.id,
      invoiceId: invoice.id,
      orderId: invoice.orderId,
      gateway: code,
      paymentMethod: config.name,
      amountCents: invoice.totalCents,
      currency: invoice.currency,
      status: "PENDING",
      gatewayRef: reference,
      note: String(body.note || "").slice(0, 500) || null,
    },
  });
  return NextResponse.json({ ok: true, message: "Payment submitted for verification." });
}
