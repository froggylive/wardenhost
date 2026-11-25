import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const user = await prisma.user.findUnique({ where: { verificationToken: token } });
  if (!user) return NextResponse.redirect(new URL("/login?verify=invalid", url.origin));
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null },
  });
  await createSession(user.id);
  return NextResponse.redirect(new URL("/client?verified=1", url.origin));
}
