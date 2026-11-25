"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLicenseAction, deleteLicenseAction, loginAction, logoutAction, toggleLicenseAction } from "@/app/actions";

type License = {
  id: string; key: string; label: string; allowedDomains: string;
  active: boolean; activatedAt: Date | null; lastDomain: string | null; expiresAt: Date | null;
};

export function LicenseUI({ authed, licenses }: { authed: boolean; licenses: License[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!authed) {
    return (
      <main className="wrap" style={{ maxWidth: 460 }}>
        <div className="card">
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>WardenHost License Panel</h1>
          <p className="muted" style={{ marginTop: 8 }}>Separate from the hosting admin panel.</p>
          <form style={{ marginTop: 24 }} onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError("");
            start(async () => {
              const res = await loginAction(fd);
              if (res?.error) setError(res.error);
              else router.refresh();
            });
          }}>
            <label htmlFor="password">Panel password</label>
            <input id="password" name="password" type="password" required placeholder="Enter license panel password" />
            {error && <p className="error">{error}</p>}
            <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={pending}>
              {pending ? "Checking..." : "Unlock license panel"}
            </button>
          </form>
        </div>
        <p className="muted" style={{ textAlign: "center", marginTop: 20 }}>Copyright FroggyLive. Unauthorised installation is prohibited.</p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>License Panel</h1>
          <p className="muted" style={{ marginTop: 4 }}>WardenHost · FroggyLive</p>
        </div>
        <form action={logoutAction}><button className="btn secondary">Exit</button></form>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Create license</h2>
        <form className="row" style={{ marginTop: 16 }} onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const res = await createLicenseAction(fd);
            if (res?.error) setError(res.error);
            else router.refresh();
          });
        }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="label">Label</label>
            <input id="label" name="label" defaultValue="Client license" />
          </div>
          <div style={{ flex: 2, minWidth: 220 }}>
            <label htmlFor="domains">Allowed domains (comma separated)</label>
            <input id="domains" name="domains" placeholder="example.com,www.example.com" required />
          </div>
          <div style={{ width: 130 }}>
            <label htmlFor="durationDays">Validity (days)</label>
            <input id="durationDays" name="durationDays" type="number" min="1" defaultValue="30" />
          </div>
          <button className="btn" disabled={pending}>Create license</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <table>
        <thead><tr><th>License key</th><th>Label</th><th>Allowed domains</th><th>Expires</th><th>Status</th><th>Activated</th><th></th></tr></thead>
        <tbody>
          {licenses.map((license) => (
            <tr key={license.id}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code>{license.key}</code>
                  <button className="copy" title="Copy" onClick={() => { navigator.clipboard?.writeText(license.key); }}>copy</button>
                </div>
              </td>
              <td>{license.label}</td>
              <td className="muted">{license.allowedDomains}</td>
              <td className="muted">
                {license.expiresAt
                  ? new Date(license.expiresAt).toLocaleDateString()
                  : "Never"}
                {license.expiresAt && new Date(license.expiresAt).getTime() <= Date.now() ? (
                  <span style={{ color: "#fda4af", marginLeft: 6 }}>Expired</span>
                ) : null}
              </td>
              <td><span className={`badge ${license.active ? "ok" : "off"}`}>{license.active ? "Active" : "Disabled"}</span></td>
              <td className="muted">{license.activatedAt ? new Date(license.activatedAt).toLocaleDateString() : "Never"}{license.lastDomain ? ` · ${license.lastDomain}` : ""}</td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <form action={(fd) => start(async () => { await toggleLicenseAction(fd); router.refresh(); })}>
                    <input type="hidden" name="id" value={license.id} />
                    <button className="btn secondary" title="Enable / disable">{license.active ? "Disable" : "Enable"}</button>
                  </form>
                  <form action={(fd) => start(async () => { await deleteLicenseAction(fd); router.refresh(); })}>
                    <input type="hidden" name="id" value={license.id} />
                    <button className="btn danger" title="Delete">Delete</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ marginTop: 24 }}>Copyright FroggyLive. Unauthorised installation is prohibited.</p>
    </main>
  );
}
