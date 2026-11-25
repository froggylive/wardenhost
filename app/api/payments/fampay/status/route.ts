import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleInvoice } from "@/lib/billing";
import { getFamGatewayOrderStatus } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { orderId } = await request.json().catch(() => ({}));
  if (!orderId) return NextResponse.json({ error: "Missing order id" }, { status: 400 });

  const tx = await prisma.transaction.findFirst({
    where: { gateway: "fampay", gatewayRef: String(orderId), userId: user.id },
    include: { invoice: true },
  });
  if (!tx || !tx.invoice) return NextResponse.json({ error: "Payment session not found" }, { status: 404 });

  if (tx.invoice.status === "PAID") return NextResponse.json({ status: "success", alreadyPaid: true });

  try {
    const result: any = await getFamGatewayOrderStatus(String(orderId));
    const payload = result?.data && typeof result.data === "object" ? result.data : result;
    const status = String(payload?.status || result?.status || "pending").toLowerCase();

    if (status === "success" || status === "paid") {
      const paidAmount = Number(payload?.payable_amount ?? payload?.amount ?? tx.amountCents / 100);
      if (Math.abs(paidAmount * 100 - tx.amountCents) > 1) {
        return NextResponse.json({ error: "Payment amount does not match this invoice" }, { status: 400 });
      }
      await settleInvoice({
        invoiceId: tx.invoice.id,
        gateway: "fampay",
        amountCents: tx.amountCents,
        transactionId: tx.transactionId,
        paymentMethod: "FamGateway UPI",
        gatewayRef: payload?.utr || payload?.transaction_id || String(orderId),
        note: `FamGateway verification · UTR ${payload?.utr || "—"}`,
      });
      return NextResponse.json({ status: "success" });
    }

    return NextResponse.json({ status: status === "expired" ? "expired" : "pending" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to check payment status" }, { status: 502 });
  }
}
