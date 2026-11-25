import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, StatCard } from "@/components/ui";
import { Users, ShoppingBag, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q || "";
  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, invoices: true, services: true } },
    },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Customers" description="Registered customers and their account summary." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total customers" value={customers.length} icon={Users} />
        <StatCard label="With orders" value={customers.filter((c) => c._count.orders > 0).length} icon={ShoppingBag} />
        <StatCard label="With invoices" value={customers.filter((c) => c._count.invoices > 0).length} icon={FileText} />
      </div>
      <form className="mb-5" method="get"><input className="input w-64" name="q" placeholder="Search name or email..." defaultValue={q} /></form>
      {customers.length ? (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Invoices</th><th>Services</th><th>Verified</th><th>Registered</th></tr></thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium text-white">{c.name}</td>
                    <td className="text-xs">{c.email}</td>
                    <td>{c._count.orders}</td><td>{c._count.invoices}</td><td>{c._count.services}</td>
                    <td>{c.emailVerified ? <span className="badge-emerald">Yes</span> : <span className="badge-amber">No</span>}</td>
                    <td className="text-xs">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <EmptyState title="No customers found" />}
    </>
  );
}
