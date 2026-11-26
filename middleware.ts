import { NextResponse } from "next/server";

/** Blocks direct requests to source/config files even if a proxy misroutes them. */
export function middleware(request: Request) {
  const path = new URL(request.url).pathname.toLowerCase();

  if (path.startsWith("/.")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blockedPrefixes = [
    "/node_modules", "/prisma", "/app", "/components", "/lib", "/deploy",
    "/scripts", "/.next", "/.git", "/.pm2",
  ];
  if (blockedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blockedFiles = new Set([
    "/package.json", "/package-lock.json", "/tsconfig.json", "/tailwind.config.ts",
    "/postcss.config.mjs", "/next.config.mjs", "/ecosystem.config.js", "/middleware.ts",
    "/readme.md", "/security.md", "/schema.prisma",
    "/installer.sh", "/install.sh", "/deploy-lock.sh", "/deploy-unlock.sh",
    "/deploy-license-mode.sh", "/deploy-license-client.sh",
  ]);
  if (blockedFiles.has(path)) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
