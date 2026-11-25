import { NextResponse } from "next/server";
import { processExpiredServices } from "@/lib/service-maintenance";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await processExpiredServices(true);
  return NextResponse.json({ ok: true, ...result });
}
