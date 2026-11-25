import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(
    { authenticated: true, name: user.name, email: user.email, role: user.role },
    { headers: { "Cache-Control": "no-store" } }
  );
}
