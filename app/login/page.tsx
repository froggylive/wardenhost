import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { reset?: string; verify?: string } }) {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your WardenHost client area.">
      {searchParams.reset && (
        <div className="mb-4 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
          Password reset successfully. You can sign in now.
        </div>
      )}
      {searchParams.verify === "invalid" && (
        <div className="mb-4 rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          This verification link is invalid or has already been used.
        </div>
      )}
      <LoginForm />
    </AuthShell>
  );
}
