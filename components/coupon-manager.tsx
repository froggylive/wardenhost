"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Power, Percent } from "lucide-react";
import { toast } from "sonner";
import { Modal, ConfirmDialog } from "@/components/modal";
import { createCouponAction, deleteCouponAction, toggleCouponAction, updateCouponAction } from "@/lib/actions/coupons";
import { formatDate } from "@/lib/utils";

type Coupon = {
  id: string; code: string; type: string; value: number; maxUses: number | null; uses: number;
  minAmountCents: number; expiresAt: string | Date | null; active: boolean; appliesTo: string;
  categories: Array<{ categoryId: string }>; plans: Array<{ planId: string }>;
};
type Category = { id: string; name: string };
type Plan = { id: string; name: string };

export function CouponManager({ coupons, categories, plans }: { coupons: Coupon[]; categories: Category[]; plans: Plan[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (editing) data.set("id", editing.id);
    start(async () => {
      const res = editing ? await updateCouponAction(data) : await createCouponAction(data);
      if (res?.error) toast.error(res.error);
      else { toast.success(editing ? "Coupon updated" : "Coupon created"); setOpen(false); setEditing(null); router.refresh(); }
    });
  }

  return (
    <>
      <button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> Add Coupon</button>
      {open && (
        <Modal open onClose={() => { setOpen(false); setEditing(null); }} wide title={editing ? `Edit ${editing.code}` : "Create a coupon"}>
          <form className="space-y-5" onSubmit={save}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="code">Coupon code</label><input id="code" name="code" className="input uppercase" defaultValue={editing?.code} placeholder="WELCOME10" required /></div>
              <div><label className="label" htmlFor="type">Discount type</label><select id="type" name="type" className="input" defaultValue={editing?.type || "PERCENT"}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option></select></div>
              <div><label className="label" htmlFor="value">Value (percent or amount)</label><input id="value" name="value" type="number" min="1" className="input" defaultValue={editing?.value ?? 10} required /></div>
              <div><label className="label" htmlFor="maxUses">Maximum uses (blank = unlimited)</label><input id="maxUses" name="maxUses" type="number" min="1" className="input" defaultValue={editing?.maxUses ?? ""} /></div>
              <div><label className="label" htmlFor="minAmount">Minimum order amount</label><input id="minAmount" name="minAmount" type="number" min="0" step="0.01" className="input" defaultValue={editing ? editing.minAmountCents / 100 : 0} /></div>
              <div><label className="label" htmlFor="expiresAt">Expiration date</label><input id="expiresAt" name="expiresAt" type="date" className="input" defaultValue={editing?.expiresAt ? new Date(editing.expiresAt).toISOString().slice(0, 10) : ""} /></div>
            </div>
            <div>
              <label className="label" htmlFor="appliesTo">Applies to</label>
              <select id="appliesTo" name="appliesTo" className="input" defaultValue={editing?.appliesTo || "ALL"}>
                <option value="ALL">All plans</option><option value="CATEGORIES">Selected categories</option><option value="PLANS">Selected plans</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Categories</label><div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line bg-ink-850 p-3">{categories.map((c) => <label key={c.id} className="flex items-center gap-2 text-xs text-neutral-400"><input type="checkbox" name="categoryIds" value={c.id} className="accent-white" defaultChecked={editing?.categories.some((x) => x.categoryId === c.id)} />{c.name}</label>)}{categories.length === 0 && <span className="text-xs text-neutral-600">No categories</span>}</div></div>
              <div><label className="label">Plans</label><div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line bg-ink-850 p-3">{plans.map((p) => <label key={p.id} className="flex items-center gap-2 text-xs text-neutral-400"><input type="checkbox" name="planIds" value={p.id} className="accent-white" defaultChecked={editing?.plans.some((x) => x.planId === p.id)} />{p.name}</label>)}{plans.length === 0 && <span className="text-xs text-neutral-600">No plans</span>}</div></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name="active" className="accent-white" defaultChecked={editing?.active ?? true} /> Active</label>
            <div className="flex justify-end gap-2 border-t border-line pt-5"><button type="button" className="btn-secondary" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</button><button className="btn-primary" disabled={pending}>{pending ? "Saving..." : "Save coupon"}</button></div>
          </form>
        </Modal>
      )}

      <div className="panel mt-6 overflow-hidden">
        {coupons.length === 0 ? <p className="p-10 text-center text-sm text-neutral-500">No coupons yet.</p> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Min amount</th><th>Expires</th><th>Applies to</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="flex items-center gap-2 font-mono text-xs text-neutral-200"><Percent size={13} className="text-neutral-600" />{c.code}</td>
                    <td className="text-xs">{c.type === "PERCENT" ? `${c.value}%` : `₹${(c.value / 100).toFixed(0)}`}</td>
                    <td className="text-xs">{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                    <td className="text-xs">₹{(c.minAmountCents / 100).toFixed(0)}</td>
                    <td className="text-xs">{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
                    <td className="text-xs capitalize">{c.appliesTo.toLowerCase()}</td>
                    <td><span className={c.active ? "badge-emerald" : "badge-zinc"}>{c.active ? "Active" : "Disabled"}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <form action={(fd) => start(async () => { const r = await toggleCouponAction(fd); if (r?.error) toast.error(r.error); else router.refresh(); })}><input type="hidden" name="id" value={c.id} /><button className="btn-ghost px-2"><Power size={15} /></button></form>
                        <button className="btn-ghost px-2" onClick={() => { setEditing(c); setOpen(true); }}><Pencil size={15} /></button>
                        <button className="btn-ghost px-2 text-rose-400" onClick={() => setDeleting(c)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} danger title={`Delete ${deleting?.code}?`} confirmLabel="Delete" busy={pending}
        onConfirm={() => {
          if (!deleting) return;
          const fd = new FormData(); fd.set("id", deleting.id);
          start(async () => { const r = await deleteCouponAction(fd); if (r?.error) toast.error(r.error); else { toast.success("Coupon deleted"); setDeleting(null); router.refresh(); } });
        }} />
    </>
  );
}
