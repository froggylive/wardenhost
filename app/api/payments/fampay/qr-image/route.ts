import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const orderId = new URL(request.url).searchParams.get("orderId") || "";
  if (!orderId) return NextResponse.json({ error: "Missing order id" }, { status: 400 });

  const tx = await prisma.transaction.findFirst({
    where: { gateway: "fampay", gatewayRef: orderId, userId: user.id },
  });
  if (!tx) return NextResponse.json({ error: "Payment session not found" }, { status: 404 });

  const res = await fetch(`https://famgateway.in/api/qr-image.php?order_id=${encodeURIComponent(orderId)}`, {
    cache: "no-store",
    headers: { Accept: "image/png" },
  });
  if (!res.ok) return NextResponse.json({ error: "Unable to load QR image" }, { status: 502 });
  return new NextResponse(await res.arrayBuffer(), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
