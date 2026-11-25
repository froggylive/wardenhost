import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const user = await requireUser();
  const services = await prisma.service.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="My Services" description="Hosting services attached to your account." />
      {services.length ? (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Service</th><th>Resources</th><th>Status</th><th>Start</th><th>Renewal</th><th></th></tr></thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td><p className="font-medium text-white">{s.name}</p><p className="text-[11px] text-neutral-600">{s.planName}</p></td>
                    <td><p className="text-xs">{s.ram} · {s.cpu}</p><p className="text-[11px] text-neutral-600">{s.disk}</p></td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="text-xs">{formatDate(s.startDate)}</td>
                    <td className="text-xs">{formatDate(s.renewalDate)}</td>
                    <td><Link href={`/client/services/${s.id}`} className="btn-ghost px-2"><ArrowUpRight size={15} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <EmptyState title="No services yet" description="Services appear here after a verified payment. Nothing is provisioned automatically unless a provisioning integration is configured." action={<Link href="/order" className="btn-primary">Browse plans</Link>} />}
    </>
  );
}
