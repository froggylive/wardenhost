"use client";

import { useState, useTransition } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { activateLicenseAction } from "@/lib/actions/license";

export function LicenseActivateForm() {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="mt-8 space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      setError("");
      start(async () => {
        const res = await activateLicenseAction(data);
        if (res?.error) setError(res.error);
        else toast.success("License activated");
      });
    }}>
      <label className="label" htmlFor="licenseKey">License key</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <KeyRound size={14} className="absolute left-3 top-3 text-neutral-600" />
          <input id="licenseKey" name="key" className="input pl-9 uppercase" placeholder="WARDEN-XXXX-XXXX-XX" required autoComplete="off" />
        </div>
        <button className="btn-primary" disabled={pending}>
          {pending && <Loader2 size={14} className="animate-spin" />} Activate
        </button>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <p className="text-[11px] text-neutral-600">License keys are issued by the site owner from the separate license panel.</p>
    </form>
  );
}
