"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { Modal, ConfirmDialog } from "@/components/modal";
import { formatMoney } from "@/lib/utils";
import { deleteCpuOptionAction, saveCpuCategoryPricesAction, saveCpuOptionAction, toggleCpuOptionAction } from "@/lib/actions/cpu";

type Cpu = { id: string; name: string; priceCents: number; active: boolean; inStock: boolean; displayOrder: number; categoryPrices?: Array<{ categoryId: string; priceCents: number }> };
type Category = { id: string; name: string };

export function CpuManager({ cpus, categories, symbol }: { cpus: Cpu[]; categories: Category[]; symbol: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cpu | null>(null);
  const [deleting, setDeleting] = useState<Cpu | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (editing) data.set("id", editing.id);
    start(async () => {
      const res = await saveCpuOptionAction(data);
      if (res?.error) toast.error(res.error);
      else { toast.success("CPU option saved"); setOpen(false); setEditing(null); router.refresh(); }
    });
  }

  return (
    <>
      <button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> Add CPU option</button>
      <div className="panel mt-6 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>CPU</th><th>Price</th><th>Order</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {cpus.map((cpu) => (
                <tr key={cpu.id}>
                  <td className="font-medium text-white">{cpu.name}</td>
                  <td>{formatMoney(cpu.priceCents, "INR", symbol)}</td>
                  <td className="text-neutral-500">{cpu.displayOrder}</td>
                  <td><span className={cpu.active ? "badge-emerald" : "badge-zinc"}>{cpu.active ? "Enabled" : "Disabled"}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <form action={(fd) => start(async () => { await toggleCpuOptionAction(fd); router.refresh(); })}>
                        <input type="hidden" name="id" value={cpu.id} />
                        <button className="btn-ghost px-2" title="Enable / disable"><Power size={15} /></button>
                      </form>
                      <button className="btn-ghost px-2" onClick={() => { setEditing(cpu); setOpen(true); }}><Pencil size={15} /></button>
                      <button className="btn-ghost px-2 text-rose-400" onClick={() => setDeleting(cpu)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : "Add a CPU option"}>
        <form className="space-y-4" onSubmit={submit}>
          <div><label className="label">CPU name</label><input name="name" className="input" defaultValue={editing?.name} placeholder="e.g. Intel Xeon 6788P" required /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Price (₹)</label><input name="price" type="number" min="0" step="1" className="input" defaultValue={editing ? editing.priceCents / 100 : 0} required /></div>
            <div><label className="label">Display order</label><input name="displayOrder" type="number" min="0" className="input" defaultValue={editing?.displayOrder ?? 99} /></div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name="active" className="accent-white" defaultChecked={editing?.active ?? true} /> Enabled (visible)</label>
            <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name="inStock" className="accent-white" defaultChecked={editing?.inStock ?? true} /> In stock (selectable)</label>
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={pending}>{pending ? "Saving..." : "Save CPU"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} danger busy={pending} title={`Delete ${deleting?.name}?`} confirmLabel="Delete"
        onConfirm={() => {
          if (!deleting) return;
          const fd = new FormData(); fd.set("id", deleting.id);
          start(async () => { await deleteCpuOptionAction(fd); toast.success("CPU option deleted"); setDeleting(null); router.refresh(); });
        }} />
      <form className="panel mt-6 p-6" onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveCpuCategoryPricesAction(new FormData(e.currentTarget));
          if (res?.error) toast.error(res.error);
          else { toast.success("Category CPU prices saved"); router.refresh(); }
        });
      }}>
        <h2 className="text-sm font-medium text-white">CPU prices by category</h2>
        <p className="mt-1 text-xs text-neutral-500">Set a different CPU price per hosting category. Blank/0 uses the global price above.</p>
        <div className="mt-5 max-h-[420px] overflow-auto rounded-xl border border-line">
          <table className="data-table">
            <thead><tr><th className="sticky left-0 bg-ink-900">CPU</th>{categories.map((c) => <th key={c.id}>{c.name}</th>)}</tr></thead>
            <tbody>
              {cpus.map((cpu) => (
                <tr key={cpu.id}>
                  <td className="sticky left-0 bg-ink-900">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium text-white">{cpu.name}</span>
                      <span className={cpu.inStock ? "badge-emerald" : "badge-rose"}>{cpu.inStock ? "In stock" : "Out of stock"}</span>
                    </div>
                  </td>
                  {categories.map((c) => {
                    const override = cpu.categoryPrices?.find((p) => p.categoryId === c.id);
                    return (
                      <td key={c.id}>
                        <input
                          type="number" min="0" step="1"
                          name={`price_${cpu.id}_${c.id}`}
                          className="input w-24 px-2 py-1.5 text-xs"
                          defaultValue={override ? override.priceCents / 100 : cpu.priceCents / 100}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end"><button className="btn-secondary" disabled={pending}>Save category prices</button></div>
      </form>
    </>
  );
}
