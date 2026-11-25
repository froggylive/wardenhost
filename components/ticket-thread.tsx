"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { customerReplyAction, closeTicketAction } from "@/lib/actions/tickets";
import { formatDateTime } from "@/lib/utils";

type Message = {
  id: string; message: string; authorName: string; isAdmin: boolean; isInternal: boolean;
  createdAt: string | Date; attachmentPath: string | null; attachmentName: string | null;
};

export function TicketThread({ ticketId, messages, closed }: { ticketId: string; messages: Message[]; closed: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="panel divide-y divide-line/60">
        {messages.length === 0 && <p className="p-5 text-xs text-neutral-500">No messages yet.</p>}
        {messages.map((m) => (
          <div key={m.id} className="p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`text-xs font-medium ${m.isAdmin ? "text-white" : "text-neutral-300"}`}>{m.authorName}</span>
              {m.isAdmin && <span className="badge-zinc">Support team</span>}
              <span className="text-[11px] text-neutral-600">{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-400">{m.message}</p>
            {m.attachmentPath && (
              <a href={m.attachmentPath} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-neutral-300 underline">{m.attachmentName || "Attachment"}</a>
            )}
          </div>
        ))}
      </div>

      {!closed && (
        <form className="panel p-5" onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          data.set("ticketId", ticketId);
          start(async () => {
            const res = await customerReplyAction(data);
            if (res?.error) toast.error(res.error);
            else { toast.success("Reply sent"); (e.currentTarget.querySelector("textarea") as HTMLTextAreaElement).value = ""; router.refresh(); }
          });
        }}>
          <label className="label" htmlFor="reply">Your reply</label>
          <textarea id="reply" name="message" className="textarea" required minLength={1} />
          <button type="submit" className="btn-primary mt-4" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />} Send reply</button>
        </form>
      )}

      {!closed && (
        <form onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          data.set("ticketId", ticketId);
          start(async () => { await closeTicketAction(data); });
        }}>
          <button type="submit" className="btn-secondary" disabled={pending}>Close ticket</button>
        </form>
      )}
    </div>
  );
}
