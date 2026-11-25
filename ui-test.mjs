import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
function ok(name, condition, detail = "") {
  results.push({ name, pass: !!condition, detail });
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

try {
  // 1. Public site
  await page.goto(BASE, { waitUntil: "networkidle" });
  ok("Homepage hero renders", (await page.locator("h1").first().innerText()).includes("Infrastructure"));
  ok("Dynamic category on homepage", await page.getByText("Specialized Compute Environments").isVisible());
  ok("Database-driven categories rendered", await page.getByText("KVM VPS", { exact: true }).first().isVisible());

  // 2. Admin login
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "admin@wardenhost.example");
  await page.fill("#password", "Admin@12345");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });
  ok("Admin login redirects to /admin", page.url().endsWith("/admin"));
  await page.getByText("Total customers").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  ok("Admin dashboard stats", await page.getByText("Total customers").isVisible());

  // 3. Create category
  await page.goto(`${BASE}/admin/categories`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add Category" }).click();
  await page.fill("#name", "Storage Nodes");
  await page.fill("#description", "High-capacity storage servers for large datasets.");
  await page.locator('input[name="displayOrder"]').fill("88");
  await page.getByRole("button", { name: "Create category" }).click();
  await page.waitForTimeout(1500);
  ok("Category created in admin table", await page.getByText("Storage Nodes", { exact: true }).first().isVisible());

  // 4. Create + publish plan in new category
  await page.goto(`${BASE}/admin/plans`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add New Plan" }).click();
  await page.selectOption("#categoryId", { label: "Storage Nodes" });
  await page.fill("#name", "Storage One");
  await page.fill("#ram", "64GB DDR5");
  await page.fill("#cpu", "800% CPU");
  await page.fill("#disk", "2TB");
  await page.fill("#storageType", "NVMe SSD");
  await page.fill("#bandwidth", "10TB");
  await page.fill("#networkSpeed", "10 Gbps");
  await page.fill("#ipv4Count", "2");
  await page.fill("#price", "1299");
  await page.fill("#shortDescription", "A test plan created through the UI.");
  const featureInputs = page.locator('input[placeholder^="Feature"]');
  await featureInputs.first().fill("Full Root Access");
  await page.getByRole("button", { name: "Add Feature" }).click();
  await featureInputs.nth(1).fill("DDoS Protection");
  await page.getByRole("button", { name: "Save and Publish" }).click();
  await page.waitForTimeout(1800);
  ok("Plan created in admin table", await page.getByText("Storage One", { exact: true }).first().isVisible());

  // 5. Verify public site reflects admin changes
  await page.goto(BASE, { waitUntil: "networkidle" });
  ok("New category visible publicly", await page.getByText("Storage Nodes", { exact: true }).first().isVisible());
  await page.goto(`${BASE}/plans/storage-nodes`, { waitUntil: "networkidle" });
  ok("New plan visible on its category page", await page.getByText("Storage One", { exact: true }).first().isVisible());

  // 6. Customer login and order
  await page.goto(`${BASE}/logout`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "demo@example.com");
  await page.fill("#password", "Demo@12345");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/client", { timeout: 15000 });
  ok("Customer login redirects to /client", page.url().endsWith("/client"));

  await page.goto(`${BASE}/order/storage-one`, { waitUntil: "networkidle" });
  ok("Order page loads for new plan", await page.getByText("Storage One", { exact: true }).first().isVisible());
  await page.fill("#coupon", "WELCOME10");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.waitForTimeout(700);
  ok("Coupon applied in checkout", await page.getByText("Coupon WELCOME10 applied").isVisible());
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL("**/client/invoices/**", { timeout: 15000 });
  ok("Order created and redirected to invoice", page.url().includes("/client/invoices/"));
  const invoiceUrl = page.url();

  await page.fill("#reference", "UPI123456789");
  await page.getByRole("button", { name: "Submit for verification" }).click();
  await page.waitForTimeout(1000);
  ok("Manual payment submitted", await page.getByText("Your payment has been submitted").isVisible());

  // 7. Admin verifies payment
  await page.goto(`${BASE}/logout`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "admin@wardenhost.example");
  await page.fill("#password", "Admin@12345");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });
  await page.goto(`${BASE}/admin/billing`, { waitUntil: "networkidle" });
  const verifyBtn = page.locator('button[title="Verify payment"]').first();
  const pendingCount = await verifyBtn.count();
  if (!pendingCount) console.log("DEBUG billing url:", page.url(), "snippet:", (await page.locator("body").innerText()).slice(-500).replace(/\n/g, " | "));
  ok("Pending payment visible to admin", pendingCount > 0);
  await verifyBtn.click();
  await page.waitForTimeout(1200);
  const verifyToasts = await page.locator("[data-sonner-toast]").allInnerTexts();
  ok("Payment verification works", verifyToasts.some((t) => t.includes("Payment verified")), verifyToasts.join(" | "));

  // 8. Customer sees paid invoice and active service
  await page.goto(`${BASE}/logout`, { waitUntil: "networkidle" });
  await page.goto(invoiceUrl, { waitUntil: "networkidle" });
  // logged out: should redirect to login
  ok("Protected invoice redirects when logged out", page.url().includes("/login"));
  await page.fill("#email", "demo@example.com");
  await page.fill("#password", "Demo@12345");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/client", { timeout: 15000 });
  await page.goto(invoiceUrl, { waitUntil: "networkidle" });
  ok("Invoice shows paid status after verification", await page.getByText("Invoice paid").isVisible());
  await page.goto(`${BASE}/client/services`, { waitUntil: "networkidle" });
  ok("Service entitlement created after payment", await page.getByText("Storage One", { exact: true }).first().isVisible());

  // 9. Support ticket
  await page.goto(`${BASE}/client/support`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New ticket" }).click();
  await page.fill("#subject", "Need help with storage");
  await page.fill("#message", "Please confirm the storage type on my new service.");
  await page.getByRole("button", { name: "Create ticket" }).click();
  await page.waitForURL("**/client/support/**", { timeout: 15000 });
  ok("Support ticket created", page.url().includes("/client/support/"));

  // 10. Mobile responsiveness
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  ok("No horizontal overflow on mobile", !overflow, `scrollWidth=${await page.evaluate(() => document.documentElement.scrollWidth)}`);
  await page.screenshot({ path: "/tmp/mobile-home.png", fullPage: false });
} catch (e) {
  console.error("TEST ERROR:", e.message);
  results.push({ name: "Test run completed without exceptions", pass: false, detail: e.message });
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\nRESULT: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exitCode = 1;
