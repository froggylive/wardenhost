import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Measures real latency from the server to configured test nodes. */
export async function POST() {
  const nodes = await getSetting<Array<{ name: string; host: string }>>("testNodes", []);
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return NextResponse.json({ error: "No test nodes configured by the administrator." }, { status: 400 });
  }

  const results = await Promise.all(
    nodes.slice(0, 6).map(async (node) => {
      const start = Date.now();
      try {
        const url = new URL(node.host);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid protocol");
        const res = await fetch(url.toString(), {
          method: "HEAD",
          signal: AbortSignal.timeout(4000),
          cache: "no-store",
          redirect: "manual",
          headers: { "User-Agent": "WardenHost-InfrastructureProbe/1.0" },
        });
        return { name: node.name, host: node.host, latencyMs: Date.now() - start, ok: true, status: res.status };
      } catch {
        return { name: node.name, host: node.host, latencyMs: null, ok: false };
      }
    })
  );

  return NextResponse.json({ results });
}
