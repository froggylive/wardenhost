"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Copy, Power, Trash2, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { Modal, ConfirmDialog } from "@/components/modal";
import { DynamicFeatures } from "@/components/dynamic-features";
import { formatMoney } from "@/lib/utils";
import {
  createPlanAction, deletePlanAction, duplicatePlanAction, setPlanActiveAction, updatePlanAction,
} from "@/lib/actions/plans";

type Plan = {
  id: string; name: string; slug: string; categoryId: string; category: { name: string };
  ram: string; cpu: string; disk: string; storageType: string; bandwidth: string; networkSpeed: string;
  ipv4Count: number; priceCents: number; currency: string; billingPeriod: string;
  shortDescription: string | null; fullDescription: string | null; orderUrl: string | null;
  image: string | null; active: boolean; inStock: boolean; featured: boolean; displayOrder: number;
  features: Array<{ id: string; text: string }>;
};
type Category = { id: string; name: string };

export function PlanManager({ plans, categories, symbol }: { plans: Plan[]; categories: Category[]; symbol: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [pending, start] = useTransition();

  const filtered = plans.filter((p) =>
    (!catFilter || p.categoryId === catFilter) &&
    (p.name.toLowerCase().includes(query.toLowerCase()) || p.category.name.toLowerCase().includes(query.toLowerCase()))
  );

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(plan: Plan) { setEditing(plan); setOpen(true); }

  function save(form: HTMLFormElement, publish: boolean) {
    const data = new FormData(form);
    if (editing) data.set("id", editing.id);
    start(async () => {
      const res = editing ? await updatePlanAction(data, publish) : await createPlanAction(data, publish);
      if (res?.error) toast.error(res.error);
      else { toast.success(publish ? "Plan published to the website" : editing ? "Plan saved" : "Plan created"); setOpen(false); setEditing(null); router.refresh(); }
    });
  }

  function simple(formData: FormData, action: (fd: FormData) => Promise<{ error?: string; ok?: boolean }>, message: string) {
    start(async () => {
      const res = await action(formData);
      if (res?.error) toast.error(res.error);
      else { toast.success(message); router.refresh(); }
    });
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={openCreate} disabled={categories.length === 0}><Plus size={15} /> Add New Plan</button>
        {categories.length === 0 && <span className="text-xs text-amber-400">Create a category first.</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <div className="relative"><Search size={14} className="absolute left-3 top-3 text-neutral-600" /><input className="input w-52 pl-9" placeholder="Search plans..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <select className="input w-48" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {open && (
        <PlanForm
          key={editing?.id || "new"}
          plan={editing}
          categories={categories}
          pending={pending}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={save}
        />
      )}

      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-neutral-500">No plans yet. Click “Add New Plan” to create one.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Plan</th><th>Category</th><th>Resources</th><th>Price</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{p.name}</span>
                        {p.featured && <Star size={12} className="fill-neutral-400 text-neutral-400" />}
                      </div>
                      <p className="max-w-xs truncate text-[11px] text-neutral-600">{p.shortDescription || "—"}</p>
                    </td>
                    <td className="text-xs">{p.category.name}</td>
                    <td><p className="text-xs">{p.ram} · {p.cpu}</p><p className="text-[11px] text-neutral-600">{p.disk} {p.storageType}</p></td>
                    <td className="whitespace-nowrap text-xs">{formatMoney(p.priceCents, p.currency, symbol)} <span className="text-neutral-600">/ {p.billingPeriod}</span></td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <span className={p.active ? "badge-emerald" : "badge-zinc"}>{p.active ? "Published" : "Draft"}</span>
                        <span className={p.inStock ? "badge-emerald" : "badge-rose"}>{p.inStock ? "In stock" : "Out of stock"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button className="btn-ghost px-2" title="Edit" onClick={() => openEdit(p)}><Pencil size={15} /></button>
                        <form action={(fd) => simple(fd, duplicatePlanAction, "Plan duplicated as draft")}>
                          <input type="hidden" name="id" value={p.id} /><button className="btn-ghost px-2" title="Duplicate"><Copy size={15} /></button>
                        </form>
                        <form action={(fd) => simple(fd, (f) => setPlanActiveAction(f), p.active ? "Plan unpublished" : "Plan published")}>
                          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(!p.active)} />
                          <button className="btn-ghost px-2" title="Enable / disable"><Power size={15} /></button>
                        </form>
                        <button className="btn-ghost px-2 text-rose-400" title="Delete" onClick={() => setDeleting(p)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} danger busy={pending}
        title={`Delete ${deleting?.name}?`} description="This cannot be undone. Existing orders and services keep their plan snapshots."
        confirmLabel="Delete plan"
        onConfirm={() => {
          if (!deleting) return;
          const fd = new FormData(); fd.set("id", deleting.id);
          start(async () => {
            const res = await deletePlanAction(fd);
            if (res?.error) toast.error(res.error);
            else { toast.success("Plan deleted"); setDeleting(null); router.refresh(); }
          });
        }} />
    </>
  );
}

function PlanForm({ plan, categories, pending, onClose, onSave }: {
  plan: Plan | null; categories: Category[]; pending: boolean;
  onClose: () => void; onSave: (form: HTMLFormElement, publish: boolean) => void;
}) {
  return (
    <Modal open onClose={onClose} wide title={plan ? `Edit plan — ${plan.name}` : "Add a new plan"} description="All specifications and features are configurable. Publish to make it visible on the website.">
      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="categoryId">Category *</label>
            <select id="categoryId" name="categoryId" className="input" defaultValue={plan?.categoryId || categories[0]?.id} required>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="name">Plan name *</label><input id="name" name="name" className="input" defaultValue={plan?.name} placeholder="e.g. KVM 2" required /></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["ram", "RAM", "16GB DDR5"], ["cpu", "CPU cores / %", "600% CPU"], ["disk", "Disk storage", "150GB"],
            ["storageType", "Storage type", "NVMe SSD"], ["bandwidth", "Bandwidth", "2TB"], ["networkSpeed", "Network speed", "1 Gbps"],
            ["ipv4Count", "Dedicated IPv4 count", "1"], ["price", "Price (INR)", "799"], ["currency", "Currency", "INR"],
            ["billingPeriod", "Billing period code", "monthly"], ["displayOrder", "Display order", "1"],
          ].map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="label" htmlFor={key}>{label}</label>
              <input id={key} name={key} className="input" defaultValue={key === "price" && plan ? (plan.priceCents / 100).toString() : (plan as any)?.[key] ?? ""} placeholder={placeholder} type={key === "ipv4Count" || key === "price" || key === "displayOrder" ? "number" : "text"} min="0" required={["ram", "cpu", "disk", "price"].includes(key)} />
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="shortDescription">Short description</label><input id="shortDescription" name="shortDescription" className="input" defaultValue={plan?.shortDescription || ""} /></div>
          <div><label className="label" htmlFor="orderUrl">Order URL</label><input id="orderUrl" name="orderUrl" className="input" defaultValue={plan?.orderUrl || ""} placeholder="https://example.com/order/plan" /></div>
        </div>
        <div><label className="label" htmlFor="fullDescription">Full description</label><textarea id="fullDescription" name="fullDescription" className="textarea" defaultValue={plan?.fullDescription || ""} /></div>

        <div>
          <label className="label">Features</label>
          <DynamicFeatures initial={plan?.features.map((f) => f.text) || []} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="image">Plan image URL (optional)</label><input id="image" name="image" className="input" defaultValue={plan?.image || ""} /></div>
          <div><label className="label" htmlFor="imageFile">Or upload image</label><input id="imageFile" name="imageFile" type="file" className="input" accept="image/*" /></div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name="active" className="accent-white" defaultChecked={plan?.active ?? true} /> Published (visible)</label>
          <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name="inStock" className="accent-white" defaultChecked={plan?.inStock ?? true} /> In stock (orderable)</label>
          <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name="featured" className="accent-white" defaultChecked={plan?.featured ?? false} /> Featured plan</label>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-5">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-secondary" disabled={pending} onClick={(e) => onSave(e.currentTarget.form!, false)}>Save Plan</button>
          <button type="button" className="btn-primary" disabled={pending} onClick={(e) => onSave(e.currentTarget.form!, true)}>{pending ? "Saving..." : "Save and Publish"}</button>
        </div>
      </form>
    </Modal>
  );
}
