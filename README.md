# WardenHost — Premium Hosting Platform

A complete, original hosting-company platform: public marketing website, dynamic hosting
catalog, customer client area, billing with verified payments, and a full admin panel that
controls the entire business from one place.

Built from scratch with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma ·
SQLite/PostgreSQL · Zod · React Hook Form · Recharts · PDFKit · Lucide**.

---

## 1. Quick start

Requirements: Node.js 20+ and npm.

**One-command Linux installer (interactive menu):**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/froggylive/wardenhost/main/installer.sh)
```

The installer shows an ASCII-art menu with Install, Create/Reset Admin, Update,
PM2 Service Management, **Auto-fix** (dependency/Prisma/build repair) and Uninstall.
The main website auto-hosts on **http://localhost:3001**; set your domain during install.
A legacy non-PM2 installer remains available as `install.sh`.

The installer uses `whiptail` when available (otherwise plain prompts) and can install Node,
configure both `.env` files, install/build both apps, seed the database, start/stop services
and enable systemd auto-start. Helper commands after install:

```bash
wardenhost-start
wardenhost-stop
```

**Manual setup:**

```bash
cp .env.example .env
npm install
npm run db:setup      # creates the database and seeds demo data
npm run dev
```

Open <http://localhost:3001>.

Seeded accounts (change these in `.env` before seeding in any real deployment):

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@wardenhost.example` | `Admin@12345` |
| Customer | `demo@example.com` | `Demo@12345` |

Admin panel: <http://localhost:3001/admin> · Client area: <http://localhost:3001/client>

Legal pages: `/terms`, `/copyright`, `/privacy`. The copyright notice, terms text, privacy policy and the "Made By FroggyLive" credit (with Discord link) are editable in **Admin → Website Content → Legal pages & credit**.

Production:

```bash
npm run build
npm start
```

---

## 2. What is actually implemented

### Public website
- Sticky responsive navigation with **database-driven Hosting Services dropdown** and Important links.
- Hero with configurable headline/description/image, call-to-action buttons.
- Infrastructure card with **real on-demand latency measurements** from the server to administrator-configured test nodes (`POST /api/ping`). If nothing is configured, the UI says so — no fake status.
- Hosting categories and plans loaded **entirely from the database**, never hardcoded in components.
- Category introduction cards on the homepage (no individual plan cards), an about section with server-blade photography, a dedicated `/plans` page listing every active category with its own plans, and dynamic `/plans/[category-slug]` detail pages containing only that category's plans.
- Plan cards with configurable specifications/features, order flow with billing-period selection and server-side coupon validation.
- Network, announcements and support pages.
- Maintenance mode (rendered server-side, administrators retain access).

### Admin panel (`/admin`)
- Overview with real statistics: customers, plans, categories, orders, active services, pending orders, invoices, verified revenue, recent transactions/registrations and a 6-month revenue chart.
- **Categories**: create, edit, delete (with explicit protection for categories containing plans), enable/disable, reorder, image URL or secure upload, icon picker. Changes appear on the public website immediately.
- **Plans**: create, edit, duplicate, publish/unpublish, delete. Every specification, price, currency, billing period, description, order URL, image, availability, featured flag and unlimited features are configurable. Save / Save and Publish / Cancel.
- **CPU Options**: enable processor upgrades (Intel Xeon 6788P, AMD EPYC 9965, AMD Ryzen 7 7700X), set a global price, override it per hosting category and mark individual CPUs in/out of stock. Out-of-stock CPUs are shown disabled at checkout. All hosting plans are currently in stock.
- A flat order tax (₹2 by default) is added at checkout and shown as a separate invoice line. Change it in Admin → Settings → Invoice Settings → Flat order tax.
- **Orders**: filter, view details, update status, add internal notes, cancel. Customers can also cancel their own pending/awaiting-payment orders from the client area.
- **Billing**: all invoices and transactions with date/customer/status/method filters, manual invoice creation, invoice status changes, payment verification, failure marking, refund records and revenue totals.
- **Coupons**: percentage or fixed discounts, expiration, maximum uses, minimum amount, enable/disable and restrictions to selected categories or plans.
- **Support tickets**: view, reply, internal notes, status and department changes.
- **Customers** and an **audit log** of administrative actions.
- **Website Content**: all public text, hero, logo, favicon, images, footer, contact, social links, announcement banner, test nodes and billing periods.
- **Settings**: general, branding, currency, payment gateways, email, invoice, SEO, security, maintenance mode and social links.

### Client area (`/client`)
- Registration, login, logout, password reset, optional email verification, bcrypt hashing, server-side sessions in httpOnly cookies, login rate limiting.
- Dashboard, services, orders, invoices, transactions, profile/password and support tickets.
- Customers can only access their own records (server-side ownership checks on every query).
- Invoice PDF download generated on the server.
- Checkout creates an order + invoice atomically; a service entitlement is created **only after verified payment**. No fake VPS provisioning.

### Payments
- Payment abstraction with four methods: manual verification, FamPay UPI QR, Razorpay and Stripe.
- Gateway buttons are only shown when the administrator enables the method **and** credentials exist in the environment.
- Razorpay: server-created order, client checkout, HMAC-SHA256 signature verification, signed webhook.
- Stripe: server-created Checkout Session, server-side session retrieval verification, signed webhook.
- FamPay UPI QR: when a FamGateway API key is configured, the server creates a real payment session at `POST https://famgateway.in/api/create-order`, shows the returned QR/checkout page, and verifies payment via signed webhook (`/api/webhooks/fampay`) or authoritative server status check (`/api/verify-order.php`). Amounts are matched before settlement. Without an API key, a locally generated UPI QR is used with admin verification.
- Provisioning panels: Admin → Provisioning Panels lets you add Minecraft, VPS, VDS or other panel connections (API URL + key). Map a panel to a category in Admin → Categories. After verified payment, a `create` request with service specs is POSTed to that panel; the returned server ID is stored. If the panel API is not exposed, optional admin username/password fields provide an authenticated admin-session fallback. Without configuration no fake provisioning is performed.
- Maintenance: expiring services get one email, then after 3 unpaid days the panel receives a `delete` request, the service is marked deleted and another email is sent. Runs automatically on site traffic, or call `POST /api/cron/maintenance` with `x-cron-secret: $CRON_SECRET` from a cron job.
- Frontend success responses are never trusted. Settlement is idempotent: an invoice can only be paid once, duplicate transactions are prevented, and invoices/orders/services update only after verification.

---

## 3. Environment variables

See `.env.example`. Important values:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file by default; PostgreSQL connection string if you switch providers. |
| `NEXT_PUBLIC_APP_URL` | Absolute base URL used in email links and payment callbacks. |
| `SESSION_SECRET` | Long random string (generate with `openssl rand -hex 32`). |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay credentials. Webhook event: `payment.captured` → `/api/webhooks/razorpay`. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe credentials. Webhook event: `checkout.session.completed` → `/api/webhooks/stripe`. |
| `FAMPAY_UPI_ID`, `FAMPAY_MERCHANT_NAME` | FamPay UPI QR. `FAMPAY_UPI_ID` is your UPI ID/VPA (e.g. `yourname@upi`); it activates the QR option. Can also be set in Admin → Settings → FamPay UPI QR. |
| `FAMPAY_API_KEY` | Optional server-side FamPay API key, stored only in `.env` and never sent to the browser. Used for direct API verification if your FamPay merchant account supports it; the UPI QR flow does not require it. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Zoho defaults: `smtp.zoho.in`, `465` (or `587`), `support@wardenhost.net`. Use an app password. These can also be set in **Admin → Settings → Email delivery**, with a "Send test email" button. When unset, mail is logged in the server console. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DEMO_EMAIL`, `SEED_DEMO_PASSWORD` | Used only by `npm run db:seed`. |

Gateway secrets can be entered in **Admin → Settings → Payment Gateway Credentials** and are stored in a dedicated server-side `GatewayCredential` table, or supplied through environment variables (env values are used when no database value is set). Secret fields are never rendered on public pages or included in browser bundles; the admin UI only reports whether each credential is configured.

---

## 4. Switching to PostgreSQL

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Set `DATABASE_URL="postgresql://user:password@host:5432/dbname"` in `.env`.
3. Run `npx prisma migrate dev --name init && npm run db:seed` (or `npx prisma db push` for a quick start).
4. Re-run `npm run build`.

The schema uses only provider-portable types (monetary values are integer minor units, statuses are strings) so no model changes are needed.

---

## 5. Database

Prisma schema in `prisma/schema.prisma`; seed data in `prisma/seed.ts`.

Tables include users, sessions, login attempts, categories, plans, plan features, billing periods, orders, services, invoices, invoice items, transactions, payment methods, coupons, coupon categories/plans/redemptions, support tickets, ticket messages, announcements, website settings and admin activity logs, with foreign keys, indexes and timestamps.

```
npm run db:push     # sync schema without migrations (development)
npm run db:seed     # idempotent seed data
npm run db:setup    # both
npm run db:catalog  # re-import the bundled 66-plan hosting catalog (idempotent)
```

The bundled catalog (`prisma/catalog.ts`) contains 4 product lines with 11 plans each:
Dedicated LXC VDS, Dedicated KVM VDS, Budget Minecraft and Premium Minecraft.
It is imported automatically by `db:seed` and can be re-run at any time.

---

## 6. Security notes

- Server-side authorization on every admin and client route; role checks are repeated in every action.
- Passwords hashed with bcrypt; sessions stored server-side with hashed tokens in httpOnly, SameSite cookies.
- CSRF protection is provided by Next.js Server Action origin checks; webhooks use HMAC signature verification.
- All inputs validated with Zod; SQL injection prevented by Prisma parameterization.
- Uploads validated by MIME type and size (5 MB) and saved with random filenames.
- Login attempts are rate limited per email (8 attempts / 15 minutes).
- Customers cannot change their role, payment status or another customer's data.
- Audit log records administrative changes.

For production, additionally terminate TLS at your proxy, set `NODE_ENV=production`, use a managed PostgreSQL instance, configure real SMTP, and replace the seed passwords.

---

## 7. Project structure

```
app/                 App Router pages and API routes
  admin/             Admin dashboard and management pages
  client/            Customer area
  api/               Ping, coupon validation, payment and webhook APIs,
                     invoice PDF generation
components/          Reusable UI, forms, managers and shells
lib/                 Prisma, auth, settings, billing, payments, validation, actions
prisma/              Schema and idempotent seed
public/images|fonts  Monochrome server photography (locally stored) and bundled PDF fonts
```

---

## 8. Image credits

- `public/images/hero-server-rack.jpg` — server rack photograph from Unsplash (Unsplash License), converted to monochrome and resized locally.
- `public/images/about-server-blade.jpg` — "CiscoUCS.JPG" by Raysonho, licensed [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), converted to monochrome and cropped locally. Source: <https://commons.wikimedia.org/wiki/File:CiscoUCS.JPG>.
- `public/images/warden-logo.webp` and `public/favicon.png` — WardenHost emblem supplied by the project owner, stored locally (the original Discord attachment URL expires).

No image is loaded from a third-party URL at runtime; all are served from local project assets.

---

## 9. Installation protection

- `.env` contains `LICENSE_KEY` and `ALLOWED_DOMAINS`. The site renders only when the license key is present and the request host is in the allowed list — a copied folder without the private `.env` will show an activation notice instead of the site.
- The **License Panel is owner-only** and lives in its own **private** repository: `https://github.com/froggylive/wardenhost-license-panel`. It is **not** included in the public website installer or this repository. See that repo's README for the authenticated install command. It runs on port 3006 and is not accessible from the website or admin panel.
- The activation screen includes a **License key** form. Entering a valid, active key whose allowed domains include the current host unlocks that installation. Seeded owner key: `WARDEN-FROG-2026-LIVE` for localhost and `wardenhost.net` (no expiry).
- Licenses have an expiry date set from the license panel (default 30 days, or "Never" for the master key). When a license expires, the website locks automatically on the next request. Expired licenses are deleted automatically **3 days** after expiry (cleanup runs on license checks and panel visits).
- The website also calls the license panel API (`POST http://localhost:3006/api/license/validate`) with `LICENSE_API_TOKEN` for server-to-server validation. Configure `LICENSE_PANEL_URL` and `LICENSE_API_TOKEN` in both apps.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are sent on every response, and `/robots.txt` keeps private areas out of crawlers.
- Terms, copyright and credit are owner-locked in the UI and ignored by the settings action on the server.
- Production builds ship minified client bundles; server source, credentials and database files are never sent to the browser.

### 502 Bad Gateway behind Cloudflare
The app listens on **3001** now. If your origin proxy still targets 3000, update it:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/wardenhost
sudo ln -sf /etc/nginx/sites-available/wardenhost /etc/nginx/sites-enabled/wardenhost
sudo nginx -t && sudo systemctl reload nginx
pm2 restart all
```

Also confirm `ALLOWED_DOMAINS` includes your hostname and that PM2 has the app running.
A template is provided in `deploy/nginx.conf`.

No website can be made impossible to copy — anything rendered in a browser can be saved. These measures establish ownership, block casual reinstalls and make unauthorised use detectable and enforceable.

---

## 10. End-to-end test

With the app running (`npm run dev` or `npm start`) and the database seeded:

```bash
npm run test:e2e
```

This uses Playwright + Chromium to exercise the real UI: admin login, category creation,
plan creation and publishing, public-site propagation, customer login, coupon checkout,
manual payment submission, admin verification, invoice status, service creation, support
tickets and mobile overflow. It creates test records, so reset the database before a
fresh demo (`npx prisma db push --force-reset && npm run db:seed`).

---

## 11. Typical admin workflow

1. Open `/admin` and sign in.
2. **Categories → + Add Category** → enter name, description, icon, order → save. The category is immediately visible on the website.
3. **Plans → + Add New Plan** → select the new category → enter RAM, CPU, disk, price, descriptions and features → add the order URL → **Save and Publish**.
4. The plan appears on the homepage and category page instantly. Customers can order it with any enabled billing period and coupon.
