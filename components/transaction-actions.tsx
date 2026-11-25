"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { failPaymentAction, refundPaymentAction, verifyManualPaymentAction } from "@/lib/actions/admin-billing";
import { ConfirmDialog } from "@/components/modal";

export function TransactionActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<"refund" | "fail" | null>(null);

  function act(action: (fd: FormData) => Promise<{ error?: string; ok?: boolean }>, message: string) {
    const fd = new FormData(); fd.set("transactionId", id);
    start(async () => {
      const res = await action(fd);
      if (res?.error) toast.error(res.error);
      else { toast.success(message); router.refresh(); }
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {status === "PENDING" && (
          <>
            <button className="btn-ghost px-2 text-emerald-400" title="Verify payment" disabled={pending} onClick={() => act(verifyManualPaymentAction, "Payment verified")}><CheckCircle2 size={15} /></button>
            <button className="btn-ghost px-2 text-rose-400" title="Mark failed" disabled={pending} onClick={() => setConfirm("fail")}><XCircle size={15} /></button>
          </>
        )}
        {status === "SUCCESS" && (
          <button className="btn-ghost px-2 text-amber-400" title="Record refund" disabled={pending} onClick={() => setConfirm("refund")}><RotateCcw size={15} /></button>
        )}
      </div>
      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} danger={confirm === "fail"} busy={pending}
        title={confirm === "refund" ? "Record refund?" : "Mark payment as failed?"}
        description={confirm === "refund" ? "This will update the invoice and order status." : "This cannot be undone from this screen."}
        confirmLabel={confirm === "refund" ? "Record refund" : "Mark failed"}
        onConfirm={() => {
          if (confirm === "refund") act(refundPaymentAction, "Refund recorded");
          else act(failPaymentAction, "Payment marked as failed");
          setConfirm(null);
        }}
      />
    </>
  );
}
