"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X, LayoutGrid, Server, Activity, FileText, LifeBuoy, ArrowUpRight } from "lucide-react";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; slug: string; icon: string | null };

export function SiteNavbar({
  companyName,
  logoText,
  logo,
  categories,
}: {
  companyName: string;
  logoText: string;
  logo?: string;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setViewerRole(d.authenticated ? d.role : null))
      .catch(() => {});
  }, [pathname]);

  const important = [
    { label: "Network & Status", href: "/network", icon: Activity },
    { label: "Announcements", href: "/announcements", icon: FileText },
    { label: "Support Desk", href: "/client/support", icon: LifeBuoy },
    { label: "Terms of Service", href: "/terms", icon: FileText },
    { label: "Copyright", href: "/copyright", icon: FileText },
    { label: "Privacy Policy", href: "/privacy", icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink-950/90 backdrop-blur-xl">
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={companyName} className="h-8 w-8 rounded-lg border border-line object-contain" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-white text-[13px] font-extrabold tracking-tighter text-black">
              {logoText.slice(0, 1)}
            </span>
          )}
          <span className="text-[15px] font-semibold tracking-tight text-white">{companyName}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink href="/" active={pathname === "/"} label="Home" />
          <NavLink href="/plans" active={pathname.startsWith("/plans")} label="Plans" />
          <div className="relative" onMouseEnter={() => setDropdown("hosting")} onMouseLeave={() => setDropdown(null)}>
            <button className={cn(navClass, dropdown === "hosting" && "text-white")} onClick={() => setDropdown(dropdown === "hosting" ? null : "hosting")}>
              Hosting Services <ChevronDown size={13} className={cn("transition-transform", dropdown === "hosting" && "rotate-180")} />
            </button>
            {dropdown === "hosting" && (
              <div className="absolute left-0 top-full w-64 pt-2">
                <div className="overflow-hidden rounded-xl border border-line bg-ink-900 p-1.5 shadow-2xl shadow-black/60">
                  {categories.length === 0 && <p className="px-3 py-3 text-xs text-neutral-500">No services configured.</p>}
                  {categories.map((cat) => {
                    const Icon = getIcon(cat.icon);
                    return (
                      <Link key={cat.id} href={`/plans/${cat.slug}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:bg-ink-750 hover:text-white">
                        <Icon size={15} className="text-neutral-500" />
                        {cat.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="relative" onMouseEnter={() => setDropdown("important")} onMouseLeave={() => setDropdown(null)}>
            <button className={cn(navClass, dropdown === "important" && "text-white")} onClick={() => setDropdown(dropdown === "important" ? null : "important")}>
              Important <ChevronDown size={13} className={cn("transition-transform", dropdown === "important" && "rotate-180")} />
            </button>
            {dropdown === "important" && (
              <div className="absolute left-0 top-full w-56 pt-2">
                <div className="overflow-hidden rounded-xl border border-line bg-ink-900 p-1.5 shadow-2xl shadow-black/60">
                  {important.map(({ label, href, icon: Icon }) => (
                    <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:bg-ink-750 hover:text-white">
                      <Icon size={15} className="text-neutral-500" /> {label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <NavLink href="/client" active={pathname.startsWith("/client")} label="Client Area" />
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {viewerRole === "ADMIN" ? (
            <Link href="/admin" className="btn-ghost text-sm">Admin Panel</Link>
          ) : viewerRole === "CUSTOMER" ? (
            <Link href="/client" className="btn-ghost text-sm">Dashboard</Link>
          ) : (
            <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
          )}
          <Link href="/order" className="btn-primary text-sm">Order Now <ArrowUpRight size={14} /></Link>
        </div>

        <button className="rounded-lg p-2 text-neutral-300 hover:bg-ink-800 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-ink-950 px-5 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            <MobileLink href="/" label="Home" onClick={() => setOpen(false)} />
            <MobileLink href="/plans" label="Plans" onClick={() => setOpen(false)} />
            <div className="mt-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Hosting Services</div>
            {categories.map((cat) => {
              const Icon = getIcon(cat.icon);
              return (
                <MobileLink key={cat.id} href={`/plans/${cat.slug}`} label={cat.name} icon={<Icon size={15} />} onClick={() => setOpen(false)} />
              );
            })}
            <div className="mt-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Important</div>
            {important.map((item) => (
              <MobileLink key={item.href} href={item.href} label={item.label} icon={<item.icon size={15} />} onClick={() => setOpen(false)} />
            ))}
            <MobileLink href="/client" label="Client Area" icon={<LayoutGrid size={15} />} onClick={() => setOpen(false)} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={viewerRole === "ADMIN" ? "/admin" : viewerRole === "CUSTOMER" ? "/client" : "/login"} className="btn-secondary" onClick={() => setOpen(false)}>
                {viewerRole === "ADMIN" ? "Admin Panel" : viewerRole === "CUSTOMER" ? "Dashboard" : "Sign In"}
              </Link>
              <Link href="/order" className="btn-primary" onClick={() => setOpen(false)}>Order Now <ArrowUpRight size={14} /></Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

const navClass = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-neutral-400 transition-colors hover:text-white";

function NavLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return <Link href={href} className={cn(navClass, active && "text-white")}>{label}</Link>;
}

function MobileLink({ href, label, icon, onClick }: { href: string; label: string; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-300 hover:bg-ink-800 hover:text-white">
      {icon}
      {label}
    </Link>
  );
}
