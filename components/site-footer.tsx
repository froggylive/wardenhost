import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@prisma/client";

export function SiteFooter({ settings, categories }: { settings: Record<string, any>; categories: Pick<Category, "id" | "name" | "slug">[] }) {
  const socials = [
    { label: "Twitter / X", href: settings.socialTwitter },
    { label: "GitHub", href: settings.socialGithub },
    { label: "Discord", href: settings.socialDiscord },
    { label: "Instagram", href: settings.socialInstagram },
  ].filter((s) => !!s.href);

  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              {settings.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo} alt={settings.companyName || "WardenHost"} className="h-9 w-9 rounded-lg border border-line object-contain" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-white text-[13px] font-extrabold tracking-tighter text-black">
                  {String(settings.logoText || settings.companyName || "W").slice(0, 1)}
                </span>
              )}
              <span className="text-[15px] font-semibold text-white">{settings.companyName || "WardenHost"}</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">{settings.footerAbout}</p>
            <div className="mt-5 space-y-1 text-xs text-neutral-500">
              {settings.footerEmail && <p>Email: <a href={`mailto:${settings.footerEmail}`} className="hover:text-white">{settings.footerEmail}</a></p>}
              {settings.footerPhone && <p>Phone: {settings.footerPhone}</p>}
              {settings.footerAddress && <p>{settings.footerAddress}</p>}
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Services</h3>
            <ul className="space-y-2.5 text-sm text-neutral-500">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}><Link href={`/plans/${cat.slug}`} className="hover:text-white">{cat.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Company</h3>
            <ul className="space-y-2.5 text-sm text-neutral-500">
              <li><Link href="/plans" className="hover:text-white">All Plans</Link></li>
              <li><Link href="/network" className="hover:text-white">Network & Status</Link></li>
              <li><Link href="/announcements" className="hover:text-white">Announcements</Link></li>
              <li><Link href="/client/support" className="hover:text-white">Support</Link></li>
              <li><Link href="/client" className="hover:text-white">Client Area</Link></li>
              <li><Link href="/order" className="hover:text-white">Order Now</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              <li><Link href="/copyright" className="hover:text-white">Copyright</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              {socials.map((s) => (
                <li key={s.label}><a href={s.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white">{s.label} <ArrowUpRight size={11} /></a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 space-y-3 border-t border-line pt-6 text-xs text-neutral-600">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/terms" className="hover:text-neutral-300">Terms</Link>
            <Link href="/copyright" className="hover:text-neutral-300">Copyright</Link>
            <Link href="/privacy" className="hover:text-neutral-300">Privacy</Link>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {settings.copyrightOwner || settings.companyName || "WardenHost"}. All rights reserved. Unauthorised copying prohibited.</p>
            <p>
              Made By <a href={settings.creditUrl || "https://discord.com/users/1558672886020046953"} target="_blank" rel="noreferrer" className="font-medium text-neutral-300 hover:text-white">{settings.creditName || "FroggyLive"}</a>
              {" · "}<a href={settings.creditUrl || "https://discord.com/users/1558672886020046953"} target="_blank" rel="noreferrer" className="hover:text-white">Discord</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
