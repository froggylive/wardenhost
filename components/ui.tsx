import Link from "next/link";
import { cn, prettyStatus, statusTone } from "@/lib/utils";
import { Inbox, type LucideIcon } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  return <span className={`badge-${tone}`}>{prettyStatus(status)}</span>;
}

export function Badge({ children, tone = "zinc" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge-${tone}`}>{children}</span>;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-neutral-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink-800 text-neutral-500">
        <Inbox size={19} />
      </div>
      <h3 className="text-sm font-medium text-neutral-200">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-neutral-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</span>
        {Icon && <Icon size={16} className="text-neutral-600" />}
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-600">{hint}</div>}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-lg border border-line bg-ink-900 p-4">
          <div className="skeleton h-4 w-1/4" />
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function LinkButton({ href, children, variant = "secondary", className }: {
  href: string; children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; className?: string;
}) {
  return <Link href={href} className={cn(`btn-${variant}`, className)}>{children}</Link>;
}

export function SectionTitle({ eyebrow, title, description }: {
  eyebrow?: string; title: string; description?: string;
}) {
  return (
    <div className="mb-10 max-w-2xl">
      {eyebrow && <div className="section-eyebrow">{eyebrow}</div>}
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-sm leading-relaxed text-neutral-500 sm:text-base">{description}</p>}
    </div>
  );
}
