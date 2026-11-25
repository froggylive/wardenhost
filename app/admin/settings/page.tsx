import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { SettingsManager } from "@/components/settings-manager";
import { isFamGatewayConfigured } from "@/lib/payments";
import { getCredential, getGatewayCredentialStatus } from "@/lib/gateway-credentials";
import { listCustomGateways } from "@/lib/custom-gateways";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, methods, famConfigured, credentialStatus, customGateways, smtpHost, smtpPort, smtpUser, smtpFrom] = await Promise.all([
    getSettings(),
    prisma.paymentMethod.findMany({ orderBy: { displayOrder: "asc" } }),
    isFamGatewayConfigured(),
    getGatewayCredentialStatus(),
    listCustomGateways(),
    getCredential("SMTP_HOST"),
    getCredential("SMTP_PORT"),
    getCredential("SMTP_USER"),
    getCredential("SMTP_FROM"),
  ]);

  const withConfigured = methods.map((m) => ({
    ...m,
    configured:
      m.code === "razorpay"
        ? credentialStatus.RAZORPAY_KEY_ID && credentialStatus.RAZORPAY_KEY_SECRET
        : m.code === "stripe"
          ? credentialStatus.STRIPE_SECRET_KEY
          : m.code === "fampay"
            ? famConfigured
            : m.code.startsWith("custom_")
              ? !!customGateways.find((g) => g.code === m.code)
              : true,
  }));

  return (
    <>
      <PageHeader title="Settings" description="Configure the entire platform without editing source code." />
      <SettingsManager
        settings={settings}
        methods={withConfigured}
        credentialStatus={credentialStatus}
        customGateways={customGateways}
        smtp={{ host: smtpHost, port: smtpPort, user: smtpUser, from: smtpFrom, passwordConfigured: credentialStatus.SMTP_PASSWORD }}
        env={{
          smtp: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
        }}
      />
    </>
  );
}
