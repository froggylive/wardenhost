"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { createManualInvoiceAction } from "@/lib/actions/admin-billing";

export function ManualInvoice({ customers }: { customers: Array<{ id: string; name: string; email: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}><Plus size={14} /> Create invoice</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create a manual invoice">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          start(async () => {
            const res = await createManualInvoiceAction(data);
            if (res?.error) toast.error(res.error);
            else { toast.success("Invoice created"); setOpen(false); router.refresh(); }
          });
        }}>
          <div><label className="label" htmlFor="userId">Customer</label><select id="userId" name="userId" className="input" required><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}</select></div>
          <div><label className="label" htmlFor="description">Description</label><input id="description" name="description" className="input" placeholder="e.g. Additional service" required /></div>
          <div><label className="label" htmlFor="amount">Amount</label><input id="amount" name="amount" type="number" min="1" step="0.01" className="input" required /></div>
          <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={pending}>{pending ? "Creating..." : "Create invoice"}</button></div>
        </form>
      </Modal>
    </>
  );
}
