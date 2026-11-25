"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { adminTicketAction } from "@/lib/actions/tickets";

export function AdminTicketReply({ ticketId, status, department }: { ticketId: string; status: string; department: string }) {
  const [pending, start] = useTransition();
  const [internal, setInternal] = useState(false);
  return (
    <form className="panel p-5" onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      data.set("ticketId", ticketId);
      data.set("isInternal", internal ? "on" : "");
      start(async () => {
        const res = await adminTicketAction(data);
        if (res?.error) toast.error(res.error);
        else { toast.success("Ticket updated"); (e.currentTarget.querySelector("textarea") as HTMLTextAreaElement).value = ""; }
      });
    }}>
      <h3 className="mb-4 text-sm font-medium text-white">Respond & update</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="status">Status</label><select id="status" name="status" className="input" defaultValue={status}>{["OPEN", "IN_PROGRESS", "AWAITING_CUSTOMER", "CLOSED"].map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="label" htmlFor="department">Department</label><input id="department" name="department" className="input" defaultValue={department} /></div>
      </div>
      <div className="mt-4"><label className="label" htmlFor="message">Reply message</label><textarea id="message" name="message" className="textarea" placeholder="Write a reply..." /></div>
      <label className="mt-3 flex items-center gap-2 text-xs text-neutral-400"><input type="checkbox" className="accent-white" checked={internal} onChange={(e) => setInternal(e.target.checked)} /><EyeOff size={13} /> Internal note (not shown to customer)</label>
      <button className="btn-primary mt-5" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />} Save & send</button>
    </form>
  );
}
