import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getSettings } from "@/lib/settings";

export async function AuthShell({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  const settings = await getSettings();
  return (
    <main className="grid-bg relative flex min-h-screen items-center justify-center py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[600px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-[100px]" />
      <div className="container-x relative flex max-w-md flex-col">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo} alt={settings.companyName || "WardenHost"} className="h-10 w-10 rounded-lg border border-line object-contain" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-white text-sm font-extrabold tracking-tighter text-black">
              {String(settings.logoText || "W").slice(0, 1)}
            </span>
          )}
          <span className="text-base font-semibold text-white">{settings.companyName || "WardenHost"}</span>
        </Link>
        <div className="panel p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-1.5 text-xs text-neutral-500">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-neutral-600">
          <ShieldCheck size={13} /> Secure authentication · Your data stays private
        </p>
      </div>
    </main>
  );
}
