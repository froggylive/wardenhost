"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/auth";

export function ProfileForm({ user }: { user: Record<string, any> }) {
  const [pending, start] = useTransition();
  return (
    <form className="panel p-6" onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      start(async () => {
        const res = await updateProfileAction(data);
        if (res?.error) toast.error(res.error);
        else { toast.success(res.message || "Profile updated"); }
      });
    }}>
      <h2 className="mb-5 text-sm font-medium text-white">Personal details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["name", "Full name"], ["email", "Email address"], ["phone", "Phone"], ["company", "Company"],
          ["city", "City"], ["country", "Country"], ["postalCode", "Postal code"],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="label" htmlFor={key}>{label}</label>
            <input id={key} name={key} className="input" defaultValue={user[key] || ""} disabled={key === "email"} />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="address">Address</label>
          <input id="address" name="address" className="input" defaultValue={user.address || ""} />
        </div>
      </div>
      <button type="submit" className="btn-primary mt-6" disabled={pending}>{pending ? "Saving..." : "Save changes"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [pending, start] = useTransition();
  return (
    <form className="panel p-6" onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      start(async () => {
        const res = await changePasswordAction(data);
        if (res?.error) toast.error(res.error);
        else { toast.success(res.message || "Password updated"); e.currentTarget.reset(); }
      });
    }}>
      <h2 className="mb-5 text-sm font-medium text-white">Change password</h2>
      <div className="max-w-sm space-y-4">
        <div><label className="label" htmlFor="currentPassword">Current password</label><input id="currentPassword" name="currentPassword" type="password" className="input" required /></div>
        <div><label className="label" htmlFor="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" className="input" required minLength={8} /></div>
      </div>
      <button type="submit" className="btn-secondary mt-6" disabled={pending}>{pending ? "Updating..." : "Update password"}</button>
    </form>
  );
}
