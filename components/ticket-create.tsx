"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { createTicketAction } from "@/lib/actions/tickets";

export function TicketCreate({ departments }: { departments: string[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={15} /> New ticket</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Open a support ticket" description="Describe your issue and our team will follow up.">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          start(async () => {
            const res = await createTicketAction(data);
            if (res?.error) toast.error(res.error);
            else { toast.success("Ticket created"); setOpen(false); router.refresh(); }
          });
        }}>
          <div>
            <label className="label" htmlFor="department">Department</label>
            <select id="department" name="department" className="input" defaultValue={departments[0] || "General"}>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="subject">Subject</label><input id="subject" name="subject" className="input" required minLength={4} /></div>
          <div><label className="label" htmlFor="message">Message</label><textarea id="message" name="message" className="textarea" required minLength={5} /></div>
          <div>
            <label className="label" htmlFor="attachment">Attachment (optional, max 5 MB)</label>
            <input id="attachment" name="attachment" type="file" className="input" accept="image/*,.pdf,.txt,.zip,.doc,.docx" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />} Create ticket</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
