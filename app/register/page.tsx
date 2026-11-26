import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-forms";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const allowed = await getSetting<boolean>("allowRegistration", true);
  return (
    <AuthShell title="Create your account" subtitle="Manage services, invoices and support in one place.">
      {allowed ? (
        <RegisterForm />
      ) : (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-300">
          Registration is currently disabled. Contact support if you need an account.
          <div className="mt-4"><Link href="/login" className="btn-secondary">Back to sign in</Link></div>
        </div>
      )}
    </AuthShell>
  );
}
