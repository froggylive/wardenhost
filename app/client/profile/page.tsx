import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatusBadge } from "@/components/ui";
import { ProfileForm, PasswordForm } from "@/components/profile-forms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const auth = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!user) return null;
  return (
    <>
      <PageHeader title="Profile & Security" description="Manage your account information and password." action={<StatusBadge status={user.emailVerified ? "Verified" : "Unverified"} />} />
      <div className="space-y-6">
        <ProfileForm user={user} />
        <PasswordForm />
      </div>
    </>
  );
}
