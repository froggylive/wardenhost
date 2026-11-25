import { prisma } from "@/lib/prisma";
import { isAuthed } from "@/lib/auth";
import { LicenseUI } from "@/components/license-ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const authed = isAuthed();
  const licenses = authed
    ? await prisma.license.findMany({ orderBy: { createdAt: "desc" } })
    : [];
  return <LicenseUI authed={authed} licenses={licenses} />;
}
