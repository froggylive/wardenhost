"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Power, PlugZap } from "lucide-react";
import { toast } from "sonner";
import { Modal, ConfirmDialog } from "@/components/modal";
import { deletePanelAction, savePanelAction, testPanelAction, togglePanelAction } from "@/lib/actions/panels";

type Panel = {
  id: string; code: string; name: string; apiUrl: string; apiKey: string;
  createPath: string; deletePath: string; testPath: string; authHeader: string; authScheme: string;
  adminUser?: string | null; adminPassword?: string | null;
  active: boolean; description: string | null; displayOrder: number;
};

export function PanelManager({ panels }: { panels: Panel[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Panel | null>(null);
  const [deleting, setDeleting] = useState<Panel | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (editing) data.set("id", editing.id);
    start(async () => {
      const res = await savePanelAction(data);
      if (res?.error) toast.error(res.error);
      else { toast.success("Panel saved"); setOpen(false); setEditing(null); router.refresh(); }
    });
  }

  return (
    <>
      <button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={15} /> Add panel connection</button>
      <div className="panel mt-6 overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Panel</th><th>Code</th><th>API URL</th><th>API key</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {panels.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="font-medium text-white">{p.name}</p>
                    {p.description && <p className="text-[11px] text-neutral-600">{p.description}</p>}
                  </td>
                  <td className="font-mono text-xs text-neutral-400">{p.code}</td>
                  <td className="max-w-xs truncate font-mono text-[11px] text-neutral-500">{p.apiUrl || "Not configured"}</td>
                  <td className="text-[11px]">{p.apiKey ? "Configured" : "Missing"}</td>
                  <td><span className={p.active ? "badge-emerald" : "badge-zinc"}>{p.active ? "Active" : "Disabled"}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button className="btn-ghost px-2" title="Test connection" onClick={() => start(async () => {
                        const fd = new FormData(); fd.set("id", p.id);
                        const res = await testPanelAction(fd);
                        if (res?.error) toast.error(res.error); else toast.success(res.detail || "Connected");
                      })}><PlugZap size={15} /></button>
                      <form action={(fd) => start(async () => { await togglePanelAction(fd); router.refresh(); })}>
                        <input type="hidden" name="id" value={p.id} /><button className="btn-ghost px-2" title="Enable / disable"><Power size={15} /></button>
                      </form>
                      <button className="btn-ghost px-2" onClick={() => { setEditing(p); setOpen(true); }}><Pencil size={15} /></button>
                      <button className="btn-ghost px-2 text-rose-400" onClick={() => setDeleting(p)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : "Add panel connection"} wide>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Panel name</label><input name="name" className="input" defaultValue={editing?.name} placeholder="e.g. Minecraft panel" required /></div>
            <div><label className="label">Code</label><input name="code" className="input" defaultValue={editing?.code} placeholder="minecraft-panel" required={!editing} /></div>
          </div>
          <div><label className="label">Base API URL</label><input name="apiUrl" className="input" defaultValue={editing?.apiUrl} placeholder="https://vds.example.com" required /></div>
          <div><label className="label">API key</label><input name="apiKey" type="password" className="input" autoComplete="off" placeholder={editing ? "Leave blank to keep current key" : "Server-side only"} /></div>
          <div className="grid gap-4 sm:grid-cols-3 sm:col-span-2">
            <div><label className="label">Create path</label><input name="createPath" className="input" defaultValue={editing?.createPath || "/api/create"} /></div>
            <div><label className="label">Delete path</label><input name="deletePath" className="input" defaultValue={editing?.deletePath || "/api/delete"} /></div>
            <div><label className="label">Test path</label><input name="testPath" className="input" defaultValue={editing?.testPath || "/api/health"} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Auth header name</label><input name="authHeader" className="input" defaultValue={editing?.authHeader || "Authorization"} placeholder="Authorization / X-Api-Key" /></div>
            <div><label className="label">Auth scheme (blank = raw key)</label><input name="authScheme" className="input" defaultValue={editing?.authScheme ?? "Bearer"} placeholder="Bearer / Token / blank" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Admin username (fallback)</label><input name="adminUser" className="input" defaultValue={editing?.adminUser || ""} placeholder="admin" /></div>
            <div><label className="label">Admin password (fallback)</label><input name="adminPassword" type="password" className="input" autoComplete="off" placeholder={editing?.adminPassword ? "Saved — leave blank to keep" : "Optional"} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Description</label><input name="description" className="input" defaultValue={editing?.description || ""} /></div>
            <div><label className="label">Display order</label><input name="displayOrder" type="number" className="input" defaultValue={editing?.displayOrder ?? 10} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name="active" className="accent-white" defaultChecked={editing?.active ?? true} /> Active</label>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={pending}>{pending ? "Saving..." : "Save panel"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} danger title={`Delete ${deleting?.name}?`} confirmLabel="Delete"
        onConfirm={() => {
          if (!deleting) return;
          const fd = new FormData(); fd.set("id", deleting.id);
          start(async () => { await deletePanelAction(fd); toast.success("Panel deleted"); setDeleting(null); router.refresh(); });
        }} />
    </>
  );
}
