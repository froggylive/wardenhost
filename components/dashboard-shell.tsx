"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, ExternalLink } from "lucide-react";
import { ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/auth";

export type NavItem = { href: string; label: string; icon: string; badge?: string };
export type NavGroup = { label?: string; items: NavItem[] };

export function DashboardShell({
  companyName,
  logoText,
  logo,
  user,
  nav,
  children,
  homeHref = "/",
  adminArea,
  creditName,
  creditUrl,
}: {
  companyName: string;
  logoText: string;
  logo?: string;
  user: { name: string; email: string; role: string };
  nav: NavGroup[];
  children: React.ReactNode;
  homeHref?: string;
  adminArea?: boolean;
  creditName?: string;
  creditUrl?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
        <Link href={homeHref} className="flex items-center gap-2.5">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={companyName} className="h-9 w-9 rounded-lg border border-line object-contain" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-white text-[13px] font-extrabold tracking-tighter text-black">
              {String(logoText || companyName).slice(0, 1)}
            </span>
          )}
          <span className="text-sm font-semibold tracking-tight text-white">{companyName}</span>
        </Link>
        <button className="text-neutral-500 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
      </div>

      {adminArea && (
        <div className="mx-4 mt-4 rounded-lg border border-line bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Admin Panel
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {nav.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-6" : ""}>
            {group.label && <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">{group.label}</div>}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] || ICONS.Server;
                const active = item.href === "/client" || item.href === "/admin"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors",
                      active ? "bg-white/[0.07] font-medium text-white" : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-200"
                    )}>
                    <Icon size={15} className={active ? "text-neutral-200" : "text-neutral-600"} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-neutral-300">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-ink-800 text-[11px] font-semibold text-neutral-300">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-neutral-200">{user.name}</p>
            <p className="truncate text-[11px] text-neutral-600">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="rounded-md p-1.5 text-neutral-600 hover:bg-ink-800 hover:text-white" title="Sign out"><LogOut size={15} /></button>
          </form>
        </div>
        <div className="border-t border-line px-5 py-3 text-[10px] leading-relaxed text-neutral-600">
          <p>© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <p>Unauthorised copying of this panel is prohibited.</p>
          {creditName && (
            <p className="mt-1">
              Made By <a href={creditUrl || "#"} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white">{creditName}</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-ink-900 lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-ink-900 transition-transform duration-200 lg:hidden", open ? "translate-x-0" : "-translate-x-full")}>{sidebar}</aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-ink-950/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-neutral-400 hover:bg-ink-800 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
            <span className="text-xs text-neutral-600">{adminArea ? "Administration" : "Client Area"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="btn-ghost hidden text-xs sm:inline-flex"><ExternalLink size={13} /> View website</Link>
            <span className="badge-zinc">{user.role === "ADMIN" ? "Administrator" : "Customer"}</span>
          </div>
        </header>
        <main className="container-x max-w-[1400px] py-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
