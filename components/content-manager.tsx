"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, Pencil, Trash2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Modal, ConfirmDialog } from "@/components/modal";
import { saveSettingValuesAction, createAnnouncementAction, deleteAnnouncementAction, updateAnnouncementAction, saveBillingPeriodAction } from "@/lib/actions/settings";
import { formatDate } from "@/lib/utils";

type Announcement = { id: string; title: string; message: string; active: boolean; createdAt: string | Date };
type Period = { id: string; code: string; label: string; months: number; multiplier: number; active: boolean; displayOrder: number };

export function ContentManager({ settings, announcements, periods }: { settings: Record<string, any>; announcements: Announcement[]; periods: Period[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingA, setEditingA] = useState<Announcement | null>(null);
  const [modalA, setModalA] = useState(false);
  const [deletingA, setDeletingA] = useState<Announcement | null>(null);
  const [editingP, setEditingP] = useState<Period | null>(null);
  const [modalP, setModalP] = useState(false);

  const val = (key: string) => String(settings[key] ?? "");

  function saveContent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveSettingValuesAction(data);
      if (res?.error) toast.error(res.error);
      else { toast.success("Website content saved"); router.refresh(); }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveContent}>
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="panel p-6">
            <h2 className="mb-5 text-sm font-medium text-white">General & branding</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["siteTitle", "Website title"], ["companyName", "Company name"], ["logoText", "Logo letter"],
                ["logo", "Logo image URL"], ["favicon", "Favicon URL"],
                ["heroEyebrow", "Hero eyebrow"], ["currency", "Currency code"], ["currencySymbol", "Currency symbol"],
                ["invoicePrefix", "Invoice prefix"], ["orderPrefix", "Order prefix"],
                ["footerEmail", "Contact email"], ["footerPhone", "Contact phone"], ["footerAddress", "Address"],
                ["socialTwitter", "Twitter / X URL"], ["socialGithub", "GitHub URL"], ["socialDiscord", "Discord URL"], ["socialInstagram", "Instagram URL"],
              ].map(([key, label]) => (
                <div key={key}><label className="label" htmlFor={key}>{label}</label><input id={key} name={key} className="input" defaultValue={val(key)} /></div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[["file_logo", "Logo image"], ["file_favicon", "Favicon"], ["file_heroImage", "Hero image"]].map(([key, label]) => (
                <div key={key}><label className="label" htmlFor={key}>{label}</label><input id={key} name={key} type="file" className="input" accept="image/*" /></div>
              ))}
            </div>
            <div className="mt-4">
              <label className="label" htmlFor="heroImage">Hero image URL (alternative to upload)</label>
              <input id="heroImage" name="heroImage" className="input" defaultValue={val("heroImage")} />
            </div>
          </section>

          <div className="space-y-6">
            <section className="panel p-6">
              <h2 className="mb-5 text-sm font-medium text-white">Hero section</h2>
              <div><label className="label" htmlFor="heroHeadline">Headline (use Enter for line break)</label><textarea id="heroHeadline" name="heroHeadline" className="textarea" defaultValue={val("heroHeadline").replace(/\\n/g, "\n")} /></div>
              <div className="mt-4"><label className="label" htmlFor="heroDescription">Description</label><textarea id="heroDescription" name="heroDescription" className="textarea" defaultValue={val("heroDescription")} /></div>
            </section>

            <section className="panel p-6">
              <h2 className="mb-5 text-sm font-medium text-white">Footer & SEO</h2>
              <div><label className="label" htmlFor="footerAbout">Footer about</label><textarea id="footerAbout" name="footerAbout" className="textarea" defaultValue={val("footerAbout")} /></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="seoDescription">SEO description</label><input id="seoDescription" name="seoDescription" className="input" defaultValue={val("seoDescription")} /></div>
                <div><label className="label" htmlFor="seoKeywords">SEO keywords</label><input id="seoKeywords" name="seoKeywords" className="input" defaultValue={val("seoKeywords")} /></div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="panel p-6">
            <h2 className="mb-5 text-sm font-medium text-white">Announcement banner</h2>
            <div><label className="label" htmlFor="announcement">Banner text (blank disables banner)</label><input id="announcement" name="announcement" className="input" defaultValue={val("announcement")} /></div>
            <div className="mt-4"><label className="label" htmlFor="announcementLink">Banner link (optional)</label><input id="announcementLink" name="announcementLink" className="input" defaultValue={val("announcementLink")} /></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="networkLocations">Available locations</label><input id="networkLocations" name="networkLocations" className="input" defaultValue={val("networkLocations")} /></div>
              <div><label className="label" htmlFor="testNodes">Test nodes (JSON array)</label><textarea id="testNodes" name="testNodes" className="textarea" defaultValue={JSON.stringify(settings.testNodes || [])} /></div>
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="mb-5 text-sm font-medium text-white">Billing & invoice text</h2>
            <div><label className="label" htmlFor="invoiceFooter">Invoice footer</label><input id="invoiceFooter" name="invoiceFooter" className="input" defaultValue={val("invoiceFooter")} /></div>
            <div className="mt-4"><label className="label" htmlFor="manualPaymentInstructions">Manual payment instructions</label><textarea id="manualPaymentInstructions" name="manualPaymentInstructions" className="textarea" defaultValue={val("manualPaymentInstructions")} /></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[["bankName", "Bank name"], ["bankAccount", "Account number"], ["bankIfsc", "IFSC"], ["bankHolder", "Account holder"], ["supportDepartments", "Support departments (JSON array)"]].map(([key, label]) => (
                <div key={key}><label className="label" htmlFor={key}>{label}</label><input id={key} name={key} className="input" defaultValue={key === "supportDepartments" ? JSON.stringify(settings.supportDepartments || []) : val(key)} /></div>
              ))}
            </div>
          </section>

          <section className="panel p-6 xl:col-span-2">
            <div className="mb-5 flex items-center gap-2">
              <LockKeyhole size={15} className="text-amber-400" />
              <h2 className="text-sm font-medium text-white">Legal pages & credit — locked</h2>
            </div>
            <p className="mb-5 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
              These values are protected by the site owner and cannot be changed from the panel. Server-side validation also ignores any attempts to submit them.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="label" htmlFor="creditName">Credit name</label><input id="creditName" className="input opacity-70" defaultValue={val("creditName")} readOnly /></div>
              <div><label className="label" htmlFor="creditUrl">Credit / Discord URL</label><input id="creditUrl" className="input opacity-70" defaultValue={val("creditUrl")} readOnly /></div>
              <div><label className="label" htmlFor="copyrightOwner">Copyright owner</label><input id="copyrightOwner" className="input opacity-70" defaultValue={val("copyrightOwner")} readOnly /></div>
            </div>
            <div className="mt-4 space-y-4">
              <div><label className="label" htmlFor="termsContent">Terms of Service</label><textarea id="termsContent" className="textarea min-h-[180px] opacity-70" defaultValue={val("termsContent")} readOnly /></div>
              <div><label className="label" htmlFor="copyrightContent">Copyright notice</label><textarea id="copyrightContent" className="textarea min-h-[160px] opacity-70" defaultValue={val("copyrightContent")} readOnly /></div>
              <div><label className="label" htmlFor="privacyContent">Privacy policy</label><textarea id="privacyContent" className="textarea min-h-[140px] opacity-70" defaultValue={val("privacyContent")} readOnly /></div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end"><button type="submit" className="btn-primary" disabled={pending}><Save size={15} /> {pending ? "Saving..." : "Save all content"}</button></div>
      </form>

      <section className="panel p-6">
        <div className="mb-5 flex items-center justify-between">
          <div><h2 className="text-sm font-medium text-white">Announcements</h2><p className="mt-1 text-xs text-neutral-500">Published announcements appear on the homepage.</p></div>
          <button className="btn-secondary" onClick={() => { setEditingA(null); setModalA(true); }}><Plus size={14} /> Add announcement</button>
        </div>
        <div className="space-y-2">
          {announcements.length === 0 && <p className="text-xs text-neutral-600">No announcements.</p>}
          {announcements.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-ink-850 px-4 py-3">
              <div className="min-w-0"><p className="truncate text-xs font-medium text-neutral-200">{a.title}</p><p className="truncate text-[11px] text-neutral-600">{a.message}</p></div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={a.active ? "badge-emerald" : "badge-zinc"}>{a.active ? "Active" : "Hidden"}</span>
                <button className="btn-ghost px-2" onClick={() => { setEditingA(a); setModalA(true); }}><Pencil size={14} /></button>
                <button className="btn-ghost px-2 text-rose-400" onClick={() => setDeletingA(a)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="mb-5 flex items-center justify-between">
          <div><h2 className="text-sm font-medium text-white">Billing periods</h2><p className="mt-1 text-xs text-neutral-500">Price for a period = base monthly price × months × multiplier.</p></div>
          <button className="btn-secondary" onClick={() => { setEditingP(null); setModalP(true); }}><Plus size={14} /> Add period</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Label</th><th>Code</th><th>Months</th><th>Multiplier</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-white">{p.label}</td><td className="font-mono text-xs text-neutral-500">{p.code}</td>
                  <td>{p.months}</td><td>{p.multiplier}</td>
                  <td><span className={p.active ? "badge-emerald" : "badge-zinc"}>{p.active ? "Active" : "Disabled"}</span></td>
                  <td><button className="btn-ghost px-2" onClick={() => { setEditingP(p); setModalP(true); }}><Pencil size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalA && (
        <Modal open onClose={() => setModalA(false)} title={editingA ? "Edit announcement" : "New announcement"}>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            if (editingA) data.set("id", editingA.id);
            start(async () => {
              const res = editingA ? await updateAnnouncementAction(data) : await createAnnouncementAction(data);
              if (res?.error) toast.error(res.error);
              else { toast.success("Announcement saved"); setModalA(false); router.refresh(); }
            });
          }}>
            <div><label className="label" htmlFor="a-title">Title</label><input id="a-title" name="title" className="input" defaultValue={editingA?.title} required /></div>
            <div><label className="label" htmlFor="a-message">Message</label><textarea id="a-message" name="message" className="textarea" defaultValue={editingA?.message} required /></div>
            <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name="active" className="accent-white" defaultChecked={editingA?.active ?? true} /> Active</label>
            <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" className="btn-secondary" onClick={() => setModalA(false)}>Cancel</button><button className="btn-primary" disabled={pending}>Save</button></div>
          </form>
        </Modal>
      )}

      {modalP && (
        <Modal open onClose={() => setModalP(false)} title={editingP ? "Edit billing period" : "New billing period"}>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            if (editingP) data.set("id", editingP.id);
            start(async () => {
              const res = await saveBillingPeriodAction(data);
              if (res?.error) toast.error(res.error);
              else { toast.success("Billing period saved"); setModalP(false); router.refresh(); }
            });
          }}>
            <div className="grid gap-4 sm:grid-cols-2">
              {[["label", "Label", editingP?.label], ["code", "Code", editingP?.code], ["months", "Months", editingP?.months], ["multiplier", "Multiplier", editingP?.multiplier], ["displayOrder", "Display order", editingP?.displayOrder]].map(([key, label, value]) => (
                <div key={key as string}><label className="label">{label}</label><input name={key as string} className="input" defaultValue={String(value ?? "")} required /></div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" name="active" className="accent-white" defaultChecked={editingP?.active ?? true} /> Active</label>
            <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" className="btn-secondary" onClick={() => setModalP(false)}>Cancel</button><button className="btn-primary" disabled={pending}>Save</button></div>
          </form>
        </Modal>
      )}

      <ConfirmDialog open={!!deletingA} onClose={() => setDeletingA(null)} danger busy={pending} title="Delete announcement?" confirmLabel="Delete"
        onConfirm={() => {
          if (!deletingA) return;
          const fd = new FormData(); fd.set("id", deletingA.id);
          start(async () => { await deleteAnnouncementAction(fd); toast.success("Deleted"); setDeletingA(null); router.refresh(); });
        }} />
    </div>
  );
}
