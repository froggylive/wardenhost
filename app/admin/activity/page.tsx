import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  const logs = await prisma.adminActivityLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { admin: { select: { name: true, email: true } } } });
  return (
    <>
      <PageHeader title="Activity Log" description="An audit trail of administrative changes." />
      {logs.length ? (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Time</th><th>Administrator</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</td>
                    <td className="text-xs"><span className="text-neutral-200">{log.admin.name}</span><span className="text-neutral-600"> · {log.admin.email}</span></td>
                    <td><span className="badge-zinc">{log.action}</span></td>
                    <td className="text-xs">{log.entity}</td>
                    <td className="text-xs text-neutral-500">{log.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <EmptyState title="No activity recorded" description="Administrative changes will be logged here." />}
    </>
  );
}
