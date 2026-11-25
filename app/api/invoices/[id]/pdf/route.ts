import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const invoice = await prisma.invoice.findFirst({ where: { id: params.id, userId: user.id }, include: { items: true, user: true } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const settings = await getSettings();

  const fontDir = path.join(process.cwd(), "public", "fonts");
  const doc = new PDFDocument({ size: "A4", margin: 50, font: null } as any);
  // Register bundled fonts explicitly so pdfkit never relies on its bundled
  // __dirname-based standard font files, which break inside Next.js bundles.
  doc.registerFont("Helvetica", path.join(fontDir, "DejaVuSans.ttf"));
  doc.registerFont("Helvetica-Bold", path.join(fontDir, "DejaVuSans-Bold.ttf"));
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const symbol = settings.currencySymbol || "₹";
  const money = (cents: number) => formatMoney(cents, invoice.currency, symbol);

  // Header
  doc.rect(0, 0, 595, 8).fill("#0a0a0a");
  doc.fillColor("#0a0a0a").fontSize(20).font("Helvetica-Bold").text(settings.companyName || "WardenHost", 50, 45);
  doc.fillColor("#888888").fontSize(9).font("Helvetica").text(settings.footerEmail || "", 50, 70);
  doc.fillColor("#0a0a0a").fontSize(22).font("Helvetica-Bold").text("INVOICE", 400, 45, { align: "right" });
  doc.fillColor("#888888").fontSize(10).font("Helvetica").text(invoice.invoiceNumber, 400, 72, { align: "right" });
  doc.moveTo(50, 100).lineTo(545, 100).strokeColor("#dddddd").stroke();

  // Meta
  doc.fillColor("#888888").fontSize(8).text("BILL TO", 50, 120);
  doc.fillColor("#111111").fontSize(11).font("Helvetica-Bold").text(invoice.user.name, 50, 135);
  doc.font("Helvetica").fontSize(9).fillColor("#555555").text(invoice.user.email, 50, 152);
  if (invoice.user.company) doc.text(invoice.user.company, 50, 167);
  if (invoice.user.country) doc.text(invoice.user.country, 50, 182);

  doc.fillColor("#888888").fontSize(8).text("INVOICE DETAILS", 350, 120);
  const meta: [string, string][] = [
    ["Issue date", formatDate(invoice.createdAt)],
    ["Due date", formatDate(invoice.dueDate)],
    ["Status", invoice.status],
    ["Billing period", invoice.billingLabel],
  ];
  let y = 135;
  for (const [label, value] of meta) {
    doc.fillColor("#888888").fontSize(9).font("Helvetica").text(label, 350, y, { width: 100 });
    doc.fillColor("#111111").font("Helvetica-Bold").text(value, 450, y, { width: 95, align: "right" });
    y += 16;
  }

  // Table
  let ty = 215;
  doc.rect(50, ty, 495, 26).fill("#f2f2f2");
  doc.fillColor("#555555").fontSize(8).font("Helvetica-Bold").text("DESCRIPTION", 60, ty + 9, { width: 300 });
  doc.text("QTY", 390, ty + 9, { width: 40, align: "center" });
  doc.text("AMOUNT", 440, ty + 9, { width: 95, align: "right" });
  ty += 26;
  for (const item of invoice.items) {
    doc.fillColor("#111111").font("Helvetica").fontSize(9).text(item.description, 60, ty + 10, { width: 320 });
    doc.text(String(item.quantity), 390, ty + 10, { width: 40, align: "center" });
    doc.text(money(item.amountCents), 440, ty + 10, { width: 95, align: "right" });
    ty += 30;
  }
  doc.moveTo(50, ty + 4).lineTo(545, ty + 4).strokeColor("#dddddd").stroke();
  ty += 14;
  const totals: [string, string][] = [
    ["Subtotal", money(invoice.subtotalCents)],
    ["Discount", `- ${money(invoice.discountCents)}`],
    ["Tax", money(invoice.taxCents || 0)],
  ];
  for (const [label, value] of totals) {
    doc.fillColor("#777777").fontSize(9).text(label, 360, ty, { width: 90, align: "right" });
    doc.fillColor("#111111").text(value, 450, ty, { width: 95, align: "right" });
    ty += 16;
  }
  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(11).text("TOTAL", 360, ty + 4, { width: 90, align: "right" });
  doc.text(money(invoice.totalCents), 450, ty + 4, { width: 95, align: "right" });

  // Footer
  const fy = 690;
  doc.moveTo(50, fy - 12).lineTo(545, fy - 12).strokeColor("#dddddd").stroke();
  doc.fillColor("#888888").font("Helvetica").fontSize(8).text(String(settings.invoiceFooter || "Thank you for choosing WardenHost."), 50, fy);
  if (invoice.status !== "PAID" && settings.bankName) {
    doc.fillColor("#666666").fontSize(8).text(
      `Payment details: ${settings.bankName} · A/C ${settings.bankAccount} · IFSC ${settings.bankIfsc} · ${settings.bankHolder}`,
      50, fy + 16, { width: 495 }
    );
  }

  doc.end();
  const buffer = await done;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
