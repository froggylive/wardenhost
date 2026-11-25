import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/auth-forms";

export default async function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset password" subtitle="We'll send you a secure reset link.">
      <ForgotForm />
    </AuthShell>
  );
}
