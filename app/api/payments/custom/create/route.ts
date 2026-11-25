import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/crypto";
import { getCustomGatewayApiKey, getCustomGatewayConfig } from "@/lib/custom-gateways";
import { isGatewayEnabled } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { invoiceId, code } = await request.json().catch(() => ({}));
  const gatewayCode = String(code || "");
  if (!gatewayCode.startsWith("custom_")) return NextResponse.json({ error: "Invalid gateway" }, { status: 400 });
  if (!(await isGatewayEnabled(gatewayCode))) return NextResponse.json({ error: "Gateway is not available" }, { status: 400 });

  const invoice = await prisma.invoice.findFirst({ where: { id: String(invoiceId || ""), userId: user.id }, include: { user: true } });
  if (!invoice || invoice.status !== "UNPAID") return NextResponse.json({ error: "Invoice is not payable" }, { status: 404 });
  const config = (await getCustomGatewayConfig(gatewayCode))!;
  const apiKey = await getCustomGatewayApiKey(gatewayCode);
  if (!apiKey || !config.apiUrl) return NextResponse.json({ error: "Gateway is not configured" }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  try {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        amount: invoice.totalCents / 100,
        currency: invoice.currency,
        invoice_id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        order_id: invoice.orderId,
        customer_name: invoice.user.name,
        customer_email: invoice.user.email,
        return_url: `${base}/client/invoices/${invoice.id}`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || `Gateway returned ${res.status}`);
    const payload = data?.data && typeof data.data === "object" ? data.data : data;
    const url = String(payload?.url || payload?.checkout_url || payload?.payment_url || payload?.redirect_url || "");
    const qrUrl = String(payload?.qr_url || payload?.qrcode || payload?.qr || "");
    const gatewayRef = String(payload?.order_id || payload?.id || randomToken(8));

    await prisma.transaction.create({
      data: {
        transactionId: `CUS-${randomToken(8).toUpperCase()}`,
        userId: user.id,
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        gateway: gatewayCode,
        paymentMethod: config.name,
        amountCents: invoice.totalCents,
        currency: invoice.currency,
        status: "PENDING",
        gatewayRef,
      },
    });

    return NextResponse.json({ ok: true, url, qrUrl, kind: config.kind });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to start payment" }, { status: 502 });
  }
}
