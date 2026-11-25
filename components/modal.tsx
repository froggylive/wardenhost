"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-8">
      <div
        className={cn(
          "my-4 w-full animate-fade-up rounded-2xl border border-line bg-ink-900 shadow-2xl shadow-black/60",
          wide ? "max-w-4xl" : "max-w-xl"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-500 hover:bg-ink-800 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  danger,
  busy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-fade-up rounded-2xl border border-line bg-ink-900 p-6 shadow-2xl">
        <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-xl border", danger ? "border-rose-900/60 bg-rose-950/40 text-rose-400" : "border-line bg-ink-800 text-neutral-300")}>
          <AlertTriangle size={18} />
        </div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {description && <p className="mt-2 text-sm leading-relaxed text-neutral-500">{description}</p>}
        {children}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={busy}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
