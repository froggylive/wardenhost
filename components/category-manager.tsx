"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { Modal, ConfirmDialog } from "@/components/modal";
import { ICON_NAMES, getIcon } from "@/lib/icons";
import { createCategoryAction, deleteCategoryAction, toggleCategoryAction, updateCategoryAction } from "@/lib/actions/categories";

type Category = {
  id: string; name: string; slug: string; description: string; icon: string;
  image: string | null; displayOrder: number; active: boolean; _count: { plans: number };
};

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [force, setForce] = useState(false);
  const [pending, start] = useTransition();

  function close() { setOpen(false); setEditing(null); }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (editing) data.set("id", editing.id);
    start(async () => {
      const res = editing ? await updateCategoryAction(data) : await createCategoryAction(data);
      if (res?.error) toast.error(res.error);
      else { toast.success(editing ? "Category updated" : "Category created — now live on the website"); close(); router.refresh(); }
    });
  }

  function doDelete() {
    if (!deleting) return;
    const data = new FormData();
    data.set("id", deleting.id);
    data.set("force", String(force));
    start(async () => {
      const res = await deleteCategoryAction(data);
      if (res?.error) toast.error(res.error);
      else { toast.success("Category deleted"); setDeleting(null); setForce(false); router.refresh(); }
    });
  }

  return (
    <>
      <button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> Add Category</button>

      {open && (
        <Modal open={open} onClose={close} title={editing ? "Edit category" : "Add a new category"} description="Published categories appear on the public website immediately." wide>
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="name">Category name</label><input id="name" name="name" className="input" defaultValue={editing?.name} placeholder="e.g. Dedicated LXC VDS" required /></div>
              <div><label className="label" htmlFor="icon">Icon</label><select id="icon" name="icon" className="input" defaultValue={editing?.icon || "Server"}>{ICON_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
            </div>
            <div><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" className="textarea" defaultValue={editing?.description} placeholder="Describe this hosting category..." required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="image">Image URL (optional)</label><input id="image" name="image" className="input" defaultValue={editing?.image || ""} placeholder="https://... or /images/..." /></div>
              <div><label className="label" htmlFor="imageFile">Or upload image</label><input id="imageFile" name="imageFile" type="file" className="input" accept="image/*" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="displayOrder">Display order</label><input id="displayOrder" name="displayOrder" type="number" min="0" className="input" defaultValue={editing?.displayOrder ?? categories.length + 1} /></div>
              <label className="flex items-end gap-2 pb-2.5 text-sm text-neutral-300"><input type="checkbox" name="active" className="accent-white" defaultChecked={editing ? editing.active : true} /> Active (visible on website)</label>
            </div>
            <div className="flex justify-end gap-2 border-t border-line pt-5">
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Saving..." : editing ? "Save changes" : "Create category"}</button>
            </div>
          </form>
        </Modal>
      )}

      <div className="panel mt-6 overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-500">No categories yet. Create your first category to get started.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Category</th><th>Slug</th><th>Plans</th><th>Order</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {categories.map((cat) => {
                  const Icon = getIcon(cat.icon);
                  return (
                    <tr key={cat.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-850 text-neutral-400"><Icon size={15} /></span>
                          <div><p className="font-medium text-white">{cat.name}</p><p className="max-w-md truncate text-[11px] text-neutral-600">{cat.description}</p></div>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-neutral-500">/{cat.slug}</td>
                      <td>{cat._count.plans}</td>
                      <td className="text-neutral-500">{cat.displayOrder}</td>
                      <td><span className={cat.active ? "badge-emerald" : "badge-zinc"}>{cat.active ? "Active" : "Disabled"}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <form action={async (fd) => { start(async () => { const r = await toggleCategoryAction(fd); if (r?.error) toast.error(r.error); else router.refresh(); }); }}>
                            <input type="hidden" name="id" value={cat.id} />
                            <button className="btn-ghost px-2" title="Enable / disable"><Power size={15} /></button>
                          </form>
                          <button className="btn-ghost px-2" title="Edit" onClick={() => { setEditing(cat); setOpen(true); }}><Pencil size={15} /></button>
                          <button className="btn-ghost px-2 text-rose-400" title="Delete" onClick={() => { setDeleting(cat); setForce(false); }}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        danger
        busy={pending}
        title={`Delete ${deleting?.name}?`}
        description={deleting?._count.plans ? `This category contains ${deleting._count.plans} plan(s). Check the box below to also delete them.` : "This action cannot be undone."}
        confirmLabel="Delete category"
      >
        {deleting && deleting._count.plans > 0 && (
          <label className="mt-4 flex items-center gap-2 text-xs text-amber-400">
            <input type="checkbox" className="accent-white" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Also delete the {deleting._count.plans} plan(s) in this category
          </label>
        )}
      </ConfirmDialog>
    </>
  );
}
