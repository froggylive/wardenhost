import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/crypto";
import {
  buildUpiUri,
  createFamGatewayOrder,
  generateQrDataUrl,
  getFampayConfig,
  isGatewayEnabled,
} from "@/lib/payments";
import { hasFampayApiKey } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await isGatewayEnabled("fampay"))) {
    return NextResponse.json({ error: "FamPay payments are not configured" }, { status: 400 });
  }

  const { invoiceId } = await request.json().catch(() => ({}));
  const invoice = await prisma.invoice.findFirst({
    where: { id: String(invoiceId || ""), userId: user.id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "UNPAID") return NextResponse.json({ error: "Invoice is not awaiting payment" }, { status: 400 });

  // FamGateway: server creates the session and returns its own QR + checkout URL.
  if (await hasFampayApiKey()) {
    const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    try {
      const order = await createFamGatewayOrder({
        amountCents: invoice.totalCents,
        customerName: invoice.user.name,
        customerEmail: invoice.user.email,
        webhookUrl: `${base}/api/webhooks/fampay`,
        redirectUrl: `${base}/client/invoices/${invoice.id}?fam=success`,
      });

      await prisma.transaction.create({
        data: {
          transactionId: `FAM-${randomToken(8).toUpperCase()}`,
          userId: user.id,
          invoiceId: invoice.id,
          orderId: invoice.orderId,
          gateway: "fampay",
          paymentMethod: "FamGateway UPI",
          amountCents: invoice.totalCents,
          currency: invoice.currency,
          status: "PENDING",
          gatewayRef: order.orderId,
          note: `FamGateway order ${order.orderId}`,
        },
      });

      return NextResponse.json({
        mode: "fampay-gateway",
        orderId: order.orderId,
        qrUrl: `/api/payments/fampay/qr-image?orderId=${encodeURIComponent(order.orderId)}`,
        checkoutUrl: order.checkoutUrl,
        payableAmount: order.payableAmount,
        upiId: order.upiId,
        upiIntent: order.upiIntent,
        amountCents: invoice.totalCents,
        currency: invoice.currency,
        invoiceNumber: invoice.invoiceNumber,
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Unable to create payment session" }, { status: 502 });
    }
  }

  // Legacy fallback: generate a UPI QR locally from an admin-configured UPI ID.
  const config = await getFampayConfig();
  if (!config) return NextResponse.json({ error: "No UPI ID configured" }, { status: 400 });
  const upiUri = buildUpiUri({
    upiId: config.upiId,
    merchantName: config.merchantName,
    amountCents: invoice.totalCents,
    invoiceNumber: invoice.invoiceNumber,
    currency: invoice.currency,
  });
  const qrDataUrl = await generateQrDataUrl(upiUri);
  return NextResponse.json({
    mode: "local-upi",
    qrDataUrl,
    upiUri,
    upiId: config.upiId,
    merchantName: config.merchantName,
    amountCents: invoice.totalCents,
    currency: invoice.currency,
    invoiceNumber: invoice.invoiceNumber,
  });
}
