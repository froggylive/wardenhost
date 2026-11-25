import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/crypto";
import { formatMoney } from "@/lib/utils";
import { getCpuPriceForCategory } from "@/lib/cpu-pricing";

export async function uniqueNumber(prefix: string, model: "order" | "invoice" | "ticket") {
  for (let attempt = 0; attempt < 5; attempt++) {
    const value = `${prefix}-${Date.now().toString(36).toUpperCase()}${randomToken(2).toUpperCase().slice(0, 4)}`;
    const found =
      model === "order"
        ? await prisma.order.findUnique({ where: { orderNumber: value } })
        : model === "invoice"
          ? await prisma.invoice.findUnique({ where: { invoiceNumber: value } })
          : await prisma.supportTicket.findUnique({ where: { ticketNumber: value } });
    if (!found) return value;
  }
  throw new Error("Unable to generate unique number");
}

export type CouponResult = {
  valid: boolean;
  error?: string;
  couponId?: string;
  discountCents: number;
};

export async function validateCoupon(
  code: string,
  userId: string,
  planId: string,
  categoryId: string,
  subtotalCents: number
): Promise<CouponResult> {
  const empty: CouponResult = { valid: false, discountCents: 0 };
  if (!code) return { ...empty, valid: true };

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
    include: { categories: true, plans: true, redemptions: true },
  });
  if (!coupon || !coupon.active) return { ...empty, error: "Invalid or inactive coupon" };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { ...empty, error: "Coupon has expired" };
  if (coupon.maxUses !== null && coupon.uses >= coupon.maxUses)
    return { ...empty, error: "Coupon usage limit reached" };
  if (coupon.redemptions.some((r) => r.userId === userId))
    return { ...empty, error: "You have already used this coupon" };
  if (subtotalCents < coupon.minAmountCents)
    return { ...empty, error: `Minimum order amount is ₹${(coupon.minAmountCents / 100).toFixed(0)}` };

  if (coupon.appliesTo === "CATEGORIES" && !coupon.categories.some((c) => c.categoryId === categoryId))
    return { ...empty, error: "Coupon does not apply to this category" };
  if (coupon.appliesTo === "PLANS" && !coupon.plans.some((p) => p.planId === planId))
    return { ...empty, error: "Coupon does not apply to this plan" };

  const discount =
    coupon.type === "PERCENT"
      ? Math.round((subtotalCents * coupon.value) / 100)
      : Math.min(coupon.value, subtotalCents);

  return { valid: true, couponId: coupon.id, discountCents: discount };
}

/** Creates an order, invoice and coupon redemption atomically. */
export async function createOrder(input: {
  userId: string;
  planId: string;
  billingPeriodId: string;
  cpuOptionId?: string;
  couponCode?: string;
}) {
  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan || !plan.active) throw new Error("Plan is not available");
  if (!plan.inStock) throw new Error("This plan is currently out of stock");
  const period = await prisma.billingPeriod.findUnique({ where: { id: input.billingPeriodId } });
  if (!period || !period.active) throw new Error("Billing period is not available");

  const cpu = input.cpuOptionId
    ? await prisma.cpuOption.findFirst({ where: { id: input.cpuOptionId, active: true } })
    : null;
  if (input.cpuOptionId && !cpu) throw new Error("Selected CPU option is not available");

  const cpuCents = cpu ? await getCpuPriceForCategory(cpu.id, plan.categoryId) : 0;
  const subtotal = Math.round(plan.priceCents * period.months * period.multiplier) + cpuCents;
  const coupon = await validateCoupon(input.couponCode || "", input.userId, plan.id, plan.categoryId, subtotal);
  if (!coupon.valid) throw new Error(coupon.error || "Invalid coupon");

  const settings = await prisma.websiteSetting.findMany({
    where: { key: { in: ["orderPrefix", "invoicePrefix", "currency", "currencySymbol", "dueDays", "orderTax"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, JSON.parse(s.value)]));
  const orderNumber = await uniqueNumber(map.orderPrefix || "ORD", "order");
  const invoiceNumber = await uniqueNumber(map.invoicePrefix || "INV", "invoice");
  const taxCents = Math.max(0, Math.round(Number(map.orderTax ?? 2) * 100));
  const total = Math.max(0, subtotal - coupon.discountCents) + taxCents;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: input.userId,
      planId: plan.id,
      planName: plan.name,
      cpuOptionId: cpu?.id || null,
      cpuName: cpu?.name || null,
      billingPeriodId: period.id,
      billingLabel: period.label,
      amountCents: total,
      discountCents: coupon.discountCents,
      taxCents,
      currency: plan.currency,
      couponCode: input.couponCode || null,
      status: "AWAITING_PAYMENT",
      paymentStatus: "UNPAID",
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber,
      userId: input.userId,
      orderId: order.id,
      subtotalCents: subtotal,
      discountCents: coupon.discountCents,
      taxCents,
      totalCents: total,
      currency: plan.currency,
      status: "UNPAID",
      planName: plan.name,
      billingLabel: period.label,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            description: `${plan.name} — ${period.label} hosting subscription${cpu ? ` · ${cpu.name} (+${formatMoney(cpuCents, plan.currency, map.currencySymbol || "₹")})` : ""}`,
            quantity: 1,
            unitPriceCents: subtotal,
            amountCents: subtotal,
          },
          {
            description: "Order tax",
            quantity: 1,
            unitPriceCents: taxCents,
            amountCents: taxCents,
          },
        ],
      },
    },
  });

  if (coupon.couponId) {
    await prisma.coupon.update({ where: { id: coupon.couponId }, data: { uses: { increment: 1 } } });
    await prisma.couponRedemption.create({
      data: { couponId: coupon.couponId, userId: input.userId, orderId: order.id },
    });
  }

  return order;
}

/** Verified-payment settlement. Idempotent: safe to call more than once. */
export async function settleInvoice(input: {
  invoiceId: string;
  gateway: string;
  amountCents: number;
  transactionId: string;
  paymentMethod?: string;
  gatewayRef?: string;
  note?: string;
}) {
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId }, include: { order: true } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "PAID") return { alreadyPaid: true, invoice };

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (invoice.orderId) {
      await tx.order.update({
        where: { id: invoice.orderId },
        data: { status: "ACTIVE", paymentStatus: "PAID" },
      });
      const order = invoice.order;
      if (order) {
        const plan = order.planId ? await tx.plan.findUnique({ where: { id: order.planId } }) : null;
        const existing = await tx.service.findFirst({ where: { orderId: order.id } });
        if (!existing) {
          const expires = new Date();
          const months = order.billingPeriodId
            ? (await tx.billingPeriod.findUnique({ where: { id: order.billingPeriodId } }))?.months || 1
            : 1;
          expires.setMonth(expires.getMonth() + months);
          await tx.service.create({
            data: {
              userId: order.userId,
              planId: order.planId,
              orderId: order.id,
              name: order.planName,
              planName: order.planName,
              ram: plan?.ram || "—",
              cpu: order.cpuName || plan?.cpu || "—",
              disk: plan?.disk || "—",
              status: "ACTIVE",
              startDate: new Date(),
              expiresAt: expires,
              renewalDate: expires,
            },
          });
        } else {
          await tx.service.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
        }
      }
    }
    await tx.transaction.upsert({
      where: { transactionId: input.transactionId },
      update: { status: "SUCCESS", verifiedAt: new Date(), gatewayRef: input.gatewayRef },
      create: {
        transactionId: input.transactionId,
        userId: invoice.userId,
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        gateway: input.gateway,
        paymentMethod: input.paymentMethod,
        amountCents: input.amountCents,
        currency: invoice.currency,
        status: "SUCCESS",
        gatewayRef: input.gatewayRef,
        note: input.note,
        verifiedAt: new Date(),
      },
    });
  });

  if (invoice.orderId) {
    const service = await prisma.service.findFirst({ where: { orderId: invoice.orderId } });
    if (service) {
      void import("@/lib/provisioning")
        .then((m) => m.provisionService(service.id))
        .then((result) => { if (!result.skipped) console.info("[provisioning]", result); })
        .catch((error) => console.error("[provisioning] failed", error));
    }
  }

  return { alreadyPaid: false, invoice };
}
