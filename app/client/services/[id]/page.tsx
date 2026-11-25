import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const service = await prisma.service.findFirst({ where: { id: params.id, userId: user.id } });
  if (!service) notFound();

  const rows = [
    ["Plan", service.planName], ["Memory", service.ram], ["CPU", service.cpu], ["Disk", service.disk],
    ["Status", service.status], ["Start date", formatDate(service.startDate)],
    ["Expiration date", formatDate(service.expiresAt)], ["Renewal date", formatDate(service.renewalDate)],
  ];

  return (
    <>
      <Link href="/client/services" className="btn-ghost mb-6 -ml-2 text-xs"><ArrowLeft size={14} /> Back to services</Link>
      <PageHeader title={service.name} description="Service details" action={<StatusBadge status={service.status} />} />
      <div className="panel max-w-2xl p-6">
        <dl className="divide-y divide-line/60">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-3.5 text-sm">
              <dt className="text-neutral-500">{label}</dt>
              <dd className="font-medium text-neutral-200">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-5 max-w-2xl text-xs leading-relaxed text-neutral-600">
        Service records represent entitlements in our system. Virtual machines are not provisioned automatically unless a provisioning integration has been configured by the administrator.
      </p>
    </>
  );
}
