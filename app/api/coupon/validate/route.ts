import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCoupon } from "@/lib/billing";
import { getCpuPriceForCategory } from "@/lib/cpu-pricing";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json();
  const plan = await prisma.plan.findUnique({ where: { id: String(body.planId || "") } });
  const period = await prisma.billingPeriod.findUnique({ where: { id: String(body.billingPeriodId || "") } });
  if (!plan || !period) return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  const cpu = body.cpuOptionId
    ? await prisma.cpuOption.findFirst({ where: { id: String(body.cpuOptionId), active: true } })
    : null;
  const cpuCents = cpu ? await getCpuPriceForCategory(cpu.id, plan.categoryId) : 0;
  const subtotal = Math.round(plan.priceCents * period.months * period.multiplier) + cpuCents;
  const result = await validateCoupon(String(body.code || ""), user.id, plan.id, plan.categoryId, subtotal);
  return NextResponse.json({ ...result, subtotalCents: subtotal });
}
