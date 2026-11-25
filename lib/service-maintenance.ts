import { prisma } from "@/lib/prisma";
import { sendMail, serviceDeletedEmail, serviceExpiredEmail } from "@/lib/mail";
import { deprovisionService } from "@/lib/provisioning";

let lastRun = 0;

/** Emails expiring services and removes unpaid instances after 3 days. */
export async function processExpiredServices(force = false) {
  if (!force && Date.now() - lastRun < 30 * 60 * 1000) return { processed: 0 };
  lastRun = Date.now();

  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");
  const now = Date.now();
  const services = await prisma.service.findMany({
    where: {
      status: { in: ["ACTIVE", "EXPIRED"] },
      expiresAt: { lte: new Date(now) },
      deletedAt: null,
    },
    include: { user: { select: { email: true, name: true } } },
  });

  let processed = 0;
  for (const service of services) {
    const expiredAt = service.expiresAt!.getTime();
    const graceEnds = expiredAt + 3 * 24 * 60 * 60 * 1000;

    if (!service.expiryNotifiedAt) {
      const mail = await serviceExpiredEmail(service.name, `${base}/client/services/${service.id}`);
      void sendMail(service.user.email, `WardenHost — ${service.name} expired`, mail.text, mail.html);
      await prisma.service.update({ where: { id: service.id }, data: { expiryNotifiedAt: new Date(), status: "EXPIRED" } });
      processed++;
    }

    if (now >= graceEnds) {
      const result = await deprovisionService(service.id);
      await prisma.service.update({
        where: { id: service.id },
        data: { status: "DELETED", deletedAt: new Date(), externalId: null },
      });
      const mail = await serviceDeletedEmail(service.name, `${base}/client/orders`);
      void sendMail(service.user.email, `WardenHost — ${service.name} deleted`, mail.text, mail.html);
      console.info("[maintenance] service deleted", service.id, "panel:", result.skipped ? "skipped" : result.ok);
      processed++;
    }
  }
  return { processed };
}
