"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  loginAction, registerAction, forgotPasswordAction, resetPasswordAction,
} from "@/lib/actions/auth";

function Field({ label, name, type = "text", placeholder, required, autoComplete }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean; autoComplete?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} className="input" placeholder={placeholder} required={required} autoComplete={autoComplete} />
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return error ? <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">{error}</div> : null;
}

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const next = useSearchParams().get("next") || "";
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      setError("");
      start(async () => {
        const res = await loginAction(data);
        if (res?.error) setError(res.error);
      });
    }}>
      <ErrorBox error={error} />
      <input type="hidden" name="next" value={next} />
      <Field label="Email address" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="password">Password</label>
          <Link href="/forgot-password" className="mb-1.5 text-[11px] text-neutral-500 hover:text-white">Forgot password?</Link>
        </div>
        <input id="password" name="password" type="password" className="input" placeholder="••••••••" required autoComplete="current-password" />
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-400">
        <input type="checkbox" name="remember" className="accent-white" defaultChecked /> Remember me for 90 days
      </label>
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 size={15} className="animate-spin" />} Sign in
      </button>
      <p className="text-center text-xs text-neutral-500">
        No account? <Link href="/register" className="text-neutral-300 hover:text-white">Create one</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ message: string; devLink?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      setError("");
      start(async () => {
        const res = await registerAction(data);
        if (res?.error) setError(res.error);
        else if (res?.success) setResult({ message: res.message || "Account created", devLink: res.devLink });
      });
    }}>
      <ErrorBox error={error} />
      {result && (
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          {result.message}
          {result.devLink && (
            <div className="mt-2 break-all">
              Dev verification link: <a href={result.devLink} className="underline">{result.devLink}</a>
            </div>
          )}
        </div>
      )}
      <Field label="Full name" name="name" placeholder="Your name" required />
      <Field label="Email address" name="email" type="email" placeholder="you@example.com" required />
      <Field label="Password" name="password" type="password" placeholder="At least 8 characters" required />
      <Field label="Confirm password" name="confirmPassword" type="password" placeholder="Repeat password" required />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 size={15} className="animate-spin" />} Create account
      </button>
      <p className="text-center text-xs text-neutral-500">
        Already registered? <Link href="/login" className="text-neutral-300 hover:text-white">Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      setError("");
      start(async () => {
        const res = await forgotPasswordAction(data);
        if (res?.error) setError(res.error);
        else { setMessage(res.message || "Check your inbox"); setDevLink(res.devLink || ""); toast.success(res.message); }
      });
    }}>
      <ErrorBox error={error} />
      {message && <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">{message}{devLink && <div className="mt-2 break-all"><a href={devLink} className="underline">Dev reset link: {devLink}</a></div>}</div>}
      <Field label="Email address" name="email" type="email" placeholder="you@example.com" required />
      <button type="submit" className="btn-primary w-full" disabled={pending}>{pending && <Loader2 size={15} className="animate-spin" />} Send reset link</button>
      <p className="text-center text-xs"><Link href="/login" className="text-neutral-500 hover:text-white">Back to sign in</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      data.set("token", token);
      setError("");
      start(async () => {
        const res = await resetPasswordAction(data);
        if (res?.error) setError(res.error);
      });
    }}>
      <ErrorBox error={error} />
      <Field label="New password" name="password" type="password" placeholder="At least 8 characters" required />
      <Field label="Confirm password" name="confirmPassword" type="password" placeholder="Repeat password" required />
      <button type="submit" className="btn-primary w-full" disabled={pending}>{pending && <Loader2 size={15} className="animate-spin" />} Reset password</button>
    </form>
  );
}
