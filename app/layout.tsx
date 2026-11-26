import type { Metadata } from "next";
import { Toaster } from "sonner";
import { getSettings } from "@/lib/settings";
import { getAuthUser } from "@/lib/auth";
import { Wrench, LockKeyhole } from "lucide-react";
import { isLicensedInstallation } from "@/lib/license";
import { LicenseActivateForm } from "@/components/license-activate-form";
import { processExpiredServices } from "@/lib/service-maintenance";
import "./globals.css";

export const metadata: Metadata = {
  title: "WardenHost — Infrastructure Built to Perform",
  description: "Premium dedicated VDS and Minecraft hosting with predictable performance.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  void processExpiredServices().catch(() => {});
  const licensed = await isLicensedInstallation();
  const [settings, user] = licensed
    ? await Promise.all([getSettings(), getAuthUser()])
    : [{ maintenanceMode: false, maintenanceMessage: "", favicon: "/favicon.svg" } as any, null];
  const maintenance = settings.maintenanceMode === true && user?.role !== "ADMIN";
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href={typeof settings.favicon === "string" && settings.favicon ? settings.favicon : "/favicon.svg"} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans">
        {!licensed ? (
          <main className="grid-bg flex min-h-screen items-center justify-center px-6">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-ink-900 text-neutral-300"><LockKeyhole size={20} /></div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Installation not activated</h1>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                This copy of WardenHost is not licensed for this domain. Enter a valid license key issued by the administrator to activate it.
              </p>
              <LicenseActivateForm />
              <p className="mt-4 text-[11px] text-neutral-600">One valid activation unlocks the site for every visitor.</p>
              <p className="mt-3 text-xs text-neutral-600">Copyright FroggyLive. Unauthorised installation is prohibited.</p>
            </div>
          </main>
        ) : maintenance ? (
          <main className="grid-bg flex min-h-screen items-center justify-center px-6">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-ink-900 text-neutral-300"><Wrench size={20} /></div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Scheduled maintenance</h1>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">{String(settings.maintenanceMessage || "We will be back shortly.")}</p>
            </div>
          </main>
        ) : children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            classNames: {
              toast: "!border-line !bg-ink-850 !text-neutral-100",
              description: "!text-neutral-400",
            },
          }}
        />
      </body>
    </html>
  );
}
