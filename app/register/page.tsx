import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Manage services, invoices and support in one place.">
      <RegisterForm />
    </AuthShell>
  );
}
