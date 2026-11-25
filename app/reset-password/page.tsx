import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token || "";
  return (
    <AuthShell title="Choose a new password" subtitle="Your new password must be at least 8 characters.">
      {token ? <ResetForm token={token} /> : <p className="text-sm text-rose-400">Invalid reset link.</p>}
    </AuthShell>
  );
}
