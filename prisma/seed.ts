import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { importCatalog } from "./catalog";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const siteSettings: Record<string, unknown> = {
  siteTitle: "WardenHost — Infrastructure Built to Perform",
  companyName: "WardenHost",
  logoText: "WH",
  logo: "/images/warden-logo.webp",
  favicon: "/favicon.png",
  tagline: "Infrastructure Built to Perform.",
  heroHeadline: "Infrastructure\nBuilt to Perform.",
  heroDescription:
    "Reliable dedicated-resource VDS and Minecraft hosting for projects that need performance without unnecessary complexity.",
  heroImage: "/images/hero-server-rack.jpg",
  heroEyebrow: "PREMIUM HOSTING INFRASTRUCTURE",
  footerAbout:
    "WardenHost delivers dedicated-resource compute, engineered for predictable performance and backed by people who understand infrastructure.",
  footerEmail: "sales@wardenhost.example",
  footerPhone: "+91 00000 00000",
  footerAddress: "Bengaluru, India",
  announcement: "",
  announcementLink: "",
  socialTwitter: "",
  socialGithub: "",
  socialDiscord: "",
  socialInstagram: "",
  networkLocations: "Mumbai, Singapore, Frankfurt, Ashburn",
  testNodes: [
    { name: "Mumbai", host: "https://www.google.com" },
    { name: "Singapore", host: "https://www.cloudflare.com" },
  ],
  currency: "INR",
  currencySymbol: "₹",
  invoicePrefix: "INV",
  orderPrefix: "ORD",
  invoiceFooter: "Thank you for choosing WardenHost.",
  orderTax: 2,
  bankName: "Example Bank",
  bankAccount: "0000000000",
  bankIfsc: "EXMP0000000",
  bankHolder: "WardenHost",
  fampayUpiId: "",
  fampayMerchantName: "WardenHost",
  manualPaymentInstructions:
    "Transfer the exact invoice amount via UPI/IMPS/NEFT and submit the transaction reference. Our team verifies manual payments within a few hours.",
  maintenanceMode: false,
  maintenanceMessage: "We are performing scheduled maintenance. Please check back shortly.",
  allowRegistration: true,
  requireEmailVerification: false,
  seoDescription:
    "WardenHost — premium dedicated VDS and Minecraft hosting with predictable performance.",
  seoKeywords: "vps hosting, vds, minecraft hosting, kvm, lxc, nvme",
  supportDepartments: ["General", "Billing", "Technical", "Sales"],
  creditName: "FroggyLive",
  creditUrl: "https://discord.com/users/1558672886020046953",
  copyrightOwner: "FroggyLive",
  termsContent: [
    "1. ACCEPTANCE",
    "By accessing this website, the client area, or the administration panel you agree to these terms in full. If you do not agree, do not use the service.",
    "",
    "2. AUTHORISED USE",
    "This platform, its source code, design, branding, database structure and administration panel are the exclusive property of FroggyLive and WardenHost. You may use the service only for legitimate hosting purchases and account management.",
    "",
    "3. PROHIBITED CONDUCT",
    "You must not copy, clone, resell, redistribute, decompile, reverse engineer, modify, or create derivative works from any part of this website or admin panel. You must not attempt to access another customer's data, bypass authentication, abuse payment flows, or interfere with infrastructure.",
    "",
    "4. PAYMENTS",
    "Payments are processed only through the gateways enabled on this website. A service is activated only after payment has been verified by our system or staff. Prices, taxes and fees are shown before checkout and may change for future orders.",
    "",
    "5. ACCOUNTS",
    "You are responsible for keeping your credentials secure. Share access only with people you trust. Notify us immediately of unauthorised use.",
    "",
    "6. TERMINATION",
    "We may suspend or terminate accounts that violate these terms, abuse resources, or attempt to copy or compromise the platform. Violations may be reported to relevant authorities.",
    "",
    "7. DISCLAIMER",
    "Services are provided on an availability basis. We do not guarantee uninterrupted operation. These terms are governed by applicable law.",
  ].join("\n"),
  copyrightContent: [
    "COPYRIGHT & INTELLECTUAL PROPERTY NOTICE",
    "",
    "All content on this website and administration panel — including but not limited to source code, templates, graphics, logos, icons, text, database schema, configuration and documentation — is copyright © " + new Date().getFullYear() + " FroggyLive and WardenHost. All rights reserved.",
    "",
    "No part of this platform may be reproduced, distributed, publicly displayed, sold, licensed, mirrored, scraped or used to create a competing service, in whole or in part, without prior written permission from the copyright owner.",
    "",
    "The WardenHost name, logo and emblem are protected marks. Removing or altering copyright notices, credit lines, or attribution is strictly prohibited.",
    "",
    "If you believe material on this site infringes your copyright, send a written notice with: (a) your contact details, (b) identification of the copyrighted work, (c) the exact URL of the material, and (d) a statement that you are the rights holder. We will review and act on valid claims.",
    "",
    "Unauthorised copying may result in legal action, account termination and reporting to hosting providers, registrars and relevant authorities.",
  ].join("\n"),
  privacyContent: [
    "PRIVACY POLICY",
    "",
    "We collect only the information needed to operate accounts, process orders and provide support: name, email, contact details, order and invoice history, and payment references.",
    "",
    "Payment credentials are never stored in browser code. Gateway secrets are held server-side. We do not sell your personal information.",
    "",
    "Session cookies are used to keep you signed in. You can log out at any time from the client area.",
    "",
    "For data access, correction or deletion requests, contact us through the support desk.",
  ].join("\n"),
};

const categoryData: any[] = [];

const planData: Record<string, any[]> = {};

async function main() {
  console.log("Seeding database...");

  const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "Admin@12345", 10);
  const demoHash = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD || "Demo@12345", 10);

  const admin = await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL || "admin@wardenhost.example" },
    update: { role: "ADMIN", passwordHash: adminHash, emailVerified: true },
    create: {
      name: "Site Administrator",
      email: process.env.SEED_ADMIN_EMAIL || "admin@wardenhost.example",
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: process.env.SEED_DEMO_EMAIL || "demo@example.com" },
    update: { passwordHash: demoHash },
    create: {
      name: "Demo Customer",
      email: process.env.SEED_DEMO_EMAIL || "demo@example.com",
      passwordHash: demoHash,
      role: "CUSTOMER",
      emailVerified: true,
      company: "Example Studio",
      country: "India",
    },
  });

  for (const [key, value] of Object.entries(siteSettings)) {
    await prisma.websiteSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
  }

  for (const period of [
    { code: "monthly", label: "Monthly", months: 1, multiplier: 1, displayOrder: 1 },
    { code: "quarterly", label: "Quarterly", months: 3, multiplier: 0.95, displayOrder: 2 },
    { code: "semiannual", label: "Semi-Annual", months: 6, multiplier: 0.9, displayOrder: 3 },
    { code: "annual", label: "Annual", months: 12, multiplier: 0.8, displayOrder: 4 },
  ]) {
    await prisma.billingPeriod.upsert({
      where: { code: period.code },
      update: period,
      create: period,
    });
  }

  for (const method of [
    { code: "manual", name: "Manual Payment", description: "Bank transfer / UPI with admin verification", enabled: true, displayOrder: 1 },
    { code: "fampay", name: "FamPay UPI QR", description: "Scan a UPI QR with FamPay or any UPI app; admin verifies the reference", enabled: true, displayOrder: 2 },
    { code: "razorpay", name: "Razorpay (UPI / Cards)", description: "Instant checkout via Razorpay", enabled: false, displayOrder: 3 },
    { code: "stripe", name: "Stripe (Cards)", description: "Secure card checkout via Stripe", enabled: false, displayOrder: 4 },
  ]) {
    await prisma.paymentMethod.upsert({ where: { code: method.code }, update: method, create: method });
  }

  for (const cpu of [
    { name: "Intel Xeon 6788P", priceCents: 2000, active: true, displayOrder: 1 },
    { name: "AMD EPYC 9965", priceCents: 0, active: true, displayOrder: 2 },
    { name: "AMD Ryzen 7 7700X", priceCents: 0, active: true, displayOrder: 3 },
  ]) {
    await prisma.cpuOption.upsert({ where: { name: cpu.name }, update: cpu, create: cpu });
  }

  for (const [key, value] of [
    ["SMTP_HOST", "smtp.zoho.in"],
    ["SMTP_PORT", "465"],
    ["SMTP_USER", "support@wardenhost.net"],
    ["SMTP_FROM", "WardenHost <support@wardenhost.net>"],
  ]) {
    await prisma.gatewayCredential.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  for (const cat of categoryData) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(cat.name) },
      update: cat,
      create: { ...cat, slug: slugify(cat.name) },
    });

    for (const plan of planData[cat.name] || []) {
      const existing = await prisma.plan.findUnique({ where: { slug: slugify(`${cat.name}-${plan.name}`) } });
      const { features, ...rest } = plan;
      const data = {
        ...rest,
        categoryId: category.id,
        slug: slugify(`${cat.name}-${plan.name}`),
        orderUrl: `/order/${slugify(`${cat.name}-${plan.name}`)}`,
      };
      let saved;
      if (existing) {
        saved = await prisma.plan.update({ where: { id: existing.id }, data: data as any });
        await prisma.planFeature.deleteMany({ where: { planId: saved.id } });
      } else {
        saved = await prisma.plan.create({ data: data as any });
      }
      for (let i = 0; i < (features as string[]).length; i++) {
        await prisma.planFeature.create({ data: { planId: saved.id, text: (features as string[])[i], displayOrder: i } });
      }
    }
  }

  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10", type: "PERCENT", value: 10, maxUses: 100, minAmountCents: 0, active: true, appliesTo: "ALL",
    },
  });

  await prisma.license.upsert({
    where: { key: "WARDEN-FROG-2026-LIVE" },
    update: { active: true },
    create: {
      key: "WARDEN-FROG-2026-LIVE",
      label: "Owner master license",
      allowedDomains: "localhost,127.0.0.1,wardenhost.net",
      active: true,
    },
  });

  await importCatalog(prisma);

  const existingAnnouncement = await prisma.announcement.findFirst();
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: { title: "New generation NVMe nodes are live", message: "Higher IOPS, same pricing. Explore our dedicated VDS plans.", active: false },
    });
  }

  console.log("Seed complete.");
  console.log(`Admin:   ${process.env.SEED_ADMIN_EMAIL || "admin@wardenhost.example"} / ${process.env.SEED_ADMIN_PASSWORD || "Admin@12345"}`);
  console.log(`Customer: ${process.env.SEED_DEMO_EMAIL || "demo@example.com"} / ${process.env.SEED_DEMO_PASSWORD || "Demo@12345"}`);
  console.log("Admin user id:", admin.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
