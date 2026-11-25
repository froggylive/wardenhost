"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/modal";
import { customerCancelOrderAction } from "@/lib/actions/orders";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="btn-danger" onClick={() => setOpen(true)}><XCircle size={14} /> Cancel order</button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        danger
        busy={pending}
        title="Cancel this order?"
        description="Any unpaid invoice attached to this order will also be cancelled. This cannot be undone."
        confirmLabel="Cancel order"
        onConfirm={() => {
          const fd = new FormData();
          fd.set("id", orderId);
          start(async () => {
            const res = await customerCancelOrderAction(fd);
            if (res?.error) toast.error(res.error);
            else { toast.success("Order cancelled"); setOpen(false); router.refresh(); }
          });
        }}
      />
    </>
  );
}
