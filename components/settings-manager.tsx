"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Power, KeyRound, ShieldCheck, Copy, Webhook, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCustomGatewayAction, saveCustomGatewayAction, saveGatewayCredentialsAction,
  saveSettingValuesAction, toggleCustomGatewayAction, togglePaymentMethodAction,
} from "@/lib/actions/settings";
import { Modal, ConfirmDialog } from "@/components/modal";

type CustomGateway = {
  code: string; name: string; description: string; kind: string;
  apiUrl: string; instructions: string; enabled: boolean;
};

type Method = { code: string; name: string; description: string | null; enabled: boolean; configured: boolean };

function Section({ title, description, fields, settings, children }: {
  title: string; description?: string; fields?: Array<[string, string, "text" | "number" | "textarea" | "checkbox"]>;
  settings: Record<string, any>; children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form className="panel p-6" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const res = await saveSettingValuesAction(new FormData(e.currentTarget));
        if (res?.error) toast.error(res.error);
        else { toast.success("Settings saved"); router.refresh(); }
      });
    }}>
      <h2 className="text-sm font-medium text-white">{title}</h2>
      {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
      {fields && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {fields.map(([key, label, type]) => type === "checkbox" ? (
            <label key={key} className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name={key} className="accent-white" defaultChecked={settings[key] === true || settings[key] === "true"} /> {label}</label>
          ) : (
            <div key={key} className={type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="label" htmlFor={key}>{label}</label>
              {type === "textarea" ? (
                <textarea id={key} name={key} className="textarea" defaultValue={String(settings[key] ?? "")} />
              ) : (
                <input id={key} name={key} type={type} className="input" defaultValue={String(settings[key] ?? "")} />
              )}
            </div>
          ))}
        </div>
      )}
      {children}
      <div className="mt-5 flex justify-end border-t border-line pt-4"><button className="btn-secondary" disabled={pending}><Save size={14} /> {pending ? "Saving..." : "Save section"}</button></div>
    </form>
  );
}

const CREDENTIAL_FIELDS: Array<{ key: string; label: string; secret: boolean; hint: string }> = [
  { key: "FAMPAY_UPI_ID", label: "FamPay UPI ID / VPA", secret: false, hint: "e.g. yourname@upi — activates the QR option" },
  { key: "FAMPAY_MERCHANT_NAME", label: "FamPay payee name", secret: false, hint: "Shown in UPI apps when scanning" },
  { key: "FAMPAY_API_KEY", label: "FamPay API key", secret: true, hint: "Server-side only, used for direct API verification" },
  { key: "RAZORPAY_KEY_ID", label: "Razorpay key ID", secret: false, hint: "Public key identifier" },
  { key: "RAZORPAY_KEY_SECRET", label: "Razorpay key secret", secret: true, hint: "Webhook: /api/webhooks/razorpay" },
  { key: "RAZORPAY_WEBHOOK_SECRET", label: "Razorpay webhook secret", secret: true, hint: "Verifies incoming webhook signatures" },
  { key: "STRIPE_SECRET_KEY", label: "Stripe secret key", secret: true, hint: "Server-side checkout creation" },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook secret", secret: true, hint: "Webhook: /api/webhooks/stripe" },
  { key: "PANEL_API_URL", label: "Provisioning panel URL", secret: false, hint: "Base URL of your VPS/Minecraft control panel" },
  { key: "PANEL_API_KEY", label: "Provisioning panel API key", secret: true, hint: "Used to create services after verified payment" },
];

function GatewayCredentials({ status }: { status: Record<string, boolean> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form className="panel p-6 xl:col-span-2" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const res = await saveGatewayCredentialsAction(new FormData(e.currentTarget));
        if (res?.error) toast.error(res.error);
        else { toast.success("Gateway credentials saved"); router.refresh(); }
      });
    }}>
      <h2 className="text-sm font-medium text-white">5. Payment Gateway Credentials</h2>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
        Credentials are stored server-side in the database and are never rendered on public pages.
        Leave a field blank to keep its current value. Environment variables still work as a fallback.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {CREDENTIAL_FIELDS.map(({ key, label, secret, hint }) => (
          <div key={key}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="label mb-0" htmlFor={key}>{label}</label>
              <span className={`text-[10px] ${status[key] ? "text-emerald-400" : "text-neutral-600"}`}>
                {status[key] ? "Configured" : "Not set"}
              </span>
            </div>
            <input
              id={key}
              name={key}
              type={secret ? "password" : "text"}
              className="input"
              autoComplete="off"
              placeholder={status[key] ? "Leave blank to keep current value" : hint}
            />
            <div className="mt-1 flex items-start justify-between gap-2">
              <span className="text-[10px] text-neutral-600">{hint}</span>
              {status[key] && (
                <label className="flex shrink-0 items-center gap-1 text-[10px] text-amber-500">
                  <input type="checkbox" name={`clear_${key}`} className="accent-amber-500" /> Clear
                </label>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end border-t border-line pt-4">
        <button className="btn-secondary" disabled={pending}><Save size={14} /> {pending ? "Saving..." : "Save credentials"}</button>
      </div>
    </form>
  );
}

function WebhookUrls() {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const urls = [
    { name: "FamGateway", path: "/api/webhooks/fampay", note: "HMAC verified with your FamPay API key" },
    { name: "Razorpay", path: "/api/webhooks/razorpay", note: "Event: payment.captured" },
    { name: "Stripe", path: "/api/webhooks/stripe", note: "Event: checkout.session.completed" },
  ];
  return (
    <div className="panel p-6 xl:col-span-2">
      <h2 className="flex items-center gap-2 text-sm font-medium text-white"><Webhook size={15} /> Webhook endpoints</h2>
      <p className="mt-1 text-xs text-neutral-500">Configure these URLs in your payment provider dashboards. All signatures are verified server-side.</p>
      <div className="mt-4 space-y-2">
        {urls.map((u) => (
          <div key={u.name} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink-850 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-200">{u.name}</p>
              <p className="truncate font-mono text-[11px] text-neutral-500">{origin}{u.path}</p>
              <p className="mt-0.5 text-[10px] text-neutral-600">{u.note}</p>
            </div>
            <button
              type="button"
              className="btn-ghost shrink-0 px-2"
              title="Copy URL"
              onClick={() => { navigator.clipboard?.writeText(`${origin}${u.path}`); toast.success("Webhook URL copied"); }}
            >
              <Copy size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomGatewayManager({ gateways }: { gateways: CustomGateway[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomGateway | null>(null);
  const [deleting, setDeleting] = useState<CustomGateway | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (editing) data.set("id", editing.code);
    start(async () => {
      const res = await saveCustomGatewayAction(data);
      if (res?.error) toast.error(res.error);
      else { toast.success("Custom gateway saved"); setOpen(false); setEditing(null); router.refresh(); }
    });
  }

  return (
    <div className="panel p-6 xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-white">Custom payment gateways</h2>
          <p className="mt-1 text-xs text-neutral-500">Add any gateway your customers can pay with — name, API URL, key and payment type. No file edits needed.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}>Add gateway</button>
      </div>

      <div className="mt-5 space-y-2">
        {gateways.length === 0 && <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs text-neutral-600">No custom gateways yet.</p>}
        {gateways.map((g) => (
          <div key={g.code} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink-850 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-200">{g.name} <span className="text-[10px] uppercase text-neutral-600">· {g.kind}</span></p>
              <p className="truncate text-[11px] text-neutral-600">{g.description || g.apiUrl || g.instructions}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className={g.enabled ? "badge-emerald" : "badge-zinc"}>{g.enabled ? "Enabled" : "Disabled"}</span>
              <button className="btn-ghost px-2" onClick={() => start(async () => {
                const fd = new FormData(); fd.set("code", g.code); fd.set("enabled", String(!g.enabled));
                await toggleCustomGatewayAction(fd); router.refresh();
              })}><Power size={14} /></button>
              <button className="btn-ghost px-2" onClick={() => { setEditing(g); setOpen(true); }}>Edit</button>
              <button className="btn-ghost px-2 text-rose-400" onClick={() => setDeleting(g)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : "Add a custom gateway"} wide>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Gateway name</label><input name="name" className="input" defaultValue={editing?.name} placeholder="e.g. My UPI Gateway" required /></div>
            <div>
              <label className="label">Payment type</label>
              <select name="kind" className="input" defaultValue={editing?.kind || "link"}>
                <option value="link">Redirect link (your API returns a URL)</option>
                <option value="qr">QR code (your API returns a QR image URL)</option>
                <option value="manual">Manual verification (customer submits reference)</option>
              </select>
            </div>
          </div>
          <div><label className="label">Description</label><input name="description" className="input" defaultValue={editing?.description} placeholder="Shown at checkout" /></div>
          <div><label className="label">API URL</label><input name="apiUrl" className="input" defaultValue={editing?.apiUrl} placeholder="https://your-api.com/create-payment" /></div>
          <div><label className="label">API key</label><input name="apiKey" type="password" className="input" autoComplete="off" placeholder={editing ? "Leave blank to keep current key" : "Server-side only"} /></div>
          <div><label className="label">Customer instructions (for manual type)</label><textarea name="instructions" className="textarea" defaultValue={editing?.instructions} placeholder="Pay using UPI and enter the transaction reference..." /></div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={pending}>{pending ? "Saving..." : "Save gateway"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} danger busy={pending}
        title={`Delete ${deleting?.name}?`} description="This removes the gateway and its stored credentials."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleting) return;
          const fd = new FormData(); fd.set("code", deleting.code);
          start(async () => {
            const res = await deleteCustomGatewayAction(fd);
            if (res?.error) toast.error(res.error);
            else { toast.success("Gateway deleted"); setDeleting(null); router.refresh(); }
          });
        }}
      />
    </div>
  );
}

function EmailSettings({ smtp }: { smtp: { host: string; port: string; user: string; from: string; passwordConfigured: boolean } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [testTo, setTestTo] = useState(smtp.user || "");
  return (
    <form className="panel p-6 xl:col-span-2" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const res = await saveGatewayCredentialsAction(new FormData(e.currentTarget));
        if (res?.error) toast.error(res.error);
        else { toast.success("Email settings saved"); router.refresh(); }
      });
    }}>
      <h2 className="flex items-center gap-2 text-sm font-medium text-white"><Mail size={15} /> Email delivery (SMTP)</h2>
      <p className="mt-1 text-xs text-neutral-500">Verification and password-reset emails are sent from this account. Zoho: smtp.zoho.in, port 465 (SSL) or 587 (TLS).</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><label className="label">SMTP host</label><input name="SMTP_HOST" className="input" defaultValue={smtp.host} placeholder="smtp.zoho.in" /></div>
        <div><label className="label">Port</label><input name="SMTP_PORT" className="input" defaultValue={smtp.port || "465"} placeholder="465 or 587" /></div>
        <div><label className="label">Email address / username</label><input name="SMTP_USER" className="input" defaultValue={smtp.user} placeholder="support@wardenhost.net" /></div>
        <div>
          <label className="label">App password</label>
          <input name="SMTP_PASSWORD" type="password" className="input" autoComplete="off" placeholder={smtp.passwordConfigured ? "Saved — leave blank to keep" : "Paste your Zoho app password"} />
          <p className={`mt-1 text-[10px] ${smtp.passwordConfigured ? "text-emerald-400" : "text-amber-400"}`}>{smtp.passwordConfigured ? "Password configured" : "Password not configured"}</p>
        </div>
        <div className="sm:col-span-2"><label className="label">From address</label><input name="SMTP_FROM" className="input" defaultValue={smtp.from} placeholder="WardenHost <support@wardenhost.net>" /></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <input className="input w-56" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Send test to..." />
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => {
          start(async () => {
            const res = await fetch("/api/admin/test-email", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: testTo }),
            });
            const data = await res.json();
            if (!res.ok) toast.error(data.error || "Test email failed");
            else toast.success(data.message || "Test email sent");
          });
        }}>Send test email</button>
        <button className="btn-primary" disabled={pending}><Save size={14} /> Save email settings</button>
      </div>
    </form>
  );
}

export function SettingsManager({ settings, methods, credentialStatus, env, customGateways, smtp, sourceLocked }: {
  settings: Record<string, any>;
  methods: Method[];
  credentialStatus: Record<string, boolean>;
  customGateways: CustomGateway[];
  smtp: { host: string; port: string; user: string; from: string; passwordConfigured: boolean };
  sourceLocked: boolean;
  env: { smtp: boolean };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="1. General Settings" description="Basic platform behaviour." settings={settings} fields={[
        ["companyName", "Company name", "text"], ["siteTitle", "Website title", "text"],
        ["allowRegistration", "Allow new registrations", "checkbox"], ["requireEmailVerification", "Require email verification", "checkbox"],
      ]} />
      <Section title="2. Branding" description="Logo and public identity. Uploads are handled in Website Content." settings={settings} fields={[
        ["logoText", "Logo letter", "text"], ["tagline", "Tagline", "text"], ["heroImage", "Hero image URL", "text"],
      ]} />
      <Section title="3. Currency" settings={settings} fields={[
        ["currency", "Currency code", "text"], ["currencySymbol", "Currency symbol", "text"],
      ]} />
      <Section title="4. Payment Gateways" settings={settings} description="Enable a method here, then add its credentials below. Disabled or unconfigured methods are hidden from checkout.">
        <div className="mt-5 space-y-2">
          {methods.map((m) => (
            <div key={m.code} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-ink-850 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-neutral-200">{m.name}</p>
                <p className="mt-0.5 text-[11px] text-neutral-600">{m.description}</p>
                <p className={`mt-1 flex items-center gap-1 text-[10px] ${m.configured ? "text-emerald-400" : "text-amber-400"}`}>
                  <KeyRound size={11} /> {m.configured ? "Configured" : "Needs configuration"}
                </p>
              </div>
              <button
                type="button"
                className={m.enabled ? "btn-secondary" : "btn-ghost"}
                disabled={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("code", m.code);
                  start(async () => {
                    const res = await togglePaymentMethodAction(fd);
                    if (res?.error) toast.error(res.error);
                    else { toast.success("Payment method updated"); router.refresh(); }
                  });
                }}
              >
                <Power size={13} /> {m.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-line bg-ink-850 p-4 text-[11px] leading-relaxed text-neutral-500">
          <p><strong className="text-neutral-300">Manual:</strong> bank/UPI details are configured under Website Content. Payments stay pending until verified in Billing.</p>
          <p className="mt-1"><strong className="text-neutral-300">FamPay:</strong> set a UPI ID/VPA in section 5 to show the UPI QR. An optional API key can be used for direct verification if your merchant account supports it.</p>
        </div>
      </Section>
      <GatewayCredentials status={credentialStatus} />
      <WebhookUrls />
      <CustomGatewayManager gateways={customGateways} />
      <EmailSettings smtp={smtp} />
      <Section title="6. Email Configuration" description={`SMTP status: ${env.smtp ? "credentials present" : "not configured — mail is logged to the server console"}.`} settings={settings} fields={[
        ["footerEmail", "From / contact email", "text"], ["supportEmail", "Support email", "text"],
      ]} />
      <Section title="7. Invoice Settings" settings={settings} fields={[
        ["invoicePrefix", "Invoice number prefix", "text"], ["orderPrefix", "Order number prefix", "text"],
        ["orderTax", "Flat order tax (₹)", "number"], ["invoiceFooter", "Invoice footer text", "text"],
      ]} />
      <Section title="8. SEO Settings" settings={settings} fields={[
        ["seoDescription", "Meta description", "textarea"], ["seoKeywords", "Meta keywords", "text"],
      ]} />
      <Section title="9. Security Settings" description="Passwords are hashed with bcrypt; sessions are server-side and stored in httpOnly cookies." settings={settings} fields={[
        ["allowRegistration", "Allow registration", "checkbox"], ["requireEmailVerification", "Require email verification", "checkbox"],
      ]} />
      <Section title="10. Maintenance Mode" settings={settings} fields={[
        ["maintenanceMode", "Enable maintenance mode", "checkbox"], ["maintenanceMessage", "Maintenance message", "textarea"],
      ]} />
      <Section title="11. Social Links" settings={settings} fields={[
        ["socialTwitter", "Twitter / X", "text"], ["socialGithub", "GitHub", "text"],
        ["socialDiscord", "Discord", "text"], ["socialInstagram", "Instagram", "text"],
      ]} />
      <div className="panel flex items-start gap-3 p-6 xl:col-span-2">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-neutral-500" />
        <div>
          <h2 className="text-sm font-medium text-white">Security notes</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">Gateway secrets are stored in a dedicated server-side table and are never included in public settings or browser bundles. Payment success is only trusted after server-side signature verification or administrator verification. Customers can never change their role or payment status.</p>
          <p className="mt-3 text-xs">
            Source files: <span className={sourceLocked ? "badge-emerald" : "badge-amber"}>{sourceLocked ? "Locked — admin panel only" : "Unlocked — maintenance mode"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
