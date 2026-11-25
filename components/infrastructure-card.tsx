"use client";

import { useState } from "react";
import { Activity, MapPin, Radio, Loader2, Wifi } from "lucide-react";

type Node = { name: string; host: string };
type Result = { name: string; host: string; latencyMs: number | null; ok: boolean; status?: number };

export function InfrastructureCard({ nodes, locations }: { nodes: Node[]; locations: string }) {
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runTest() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodes }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ping test failed");
      setResults(data.results);
    } catch (e: any) {
      setError(e.message || "Ping test failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel mt-12 overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink-800 text-neutral-300">
            <Activity size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Infrastructure status</p>
            <p className="text-xs text-neutral-500">Measured from our network on request — no simulated data.</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={runTest} disabled={loading || nodes.length === 0}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
          {loading ? "Testing..." : "Run ping test"}
        </button>
      </div>

      <div className="grid border-t border-line sm:grid-cols-3">
        <div className="border-b border-line p-5 sm:border-b-0 sm:border-r">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-500"><MapPin size={13} /> Locations</div>
          <p className="text-xs leading-relaxed text-neutral-300">{locations || "Not configured"}</p>
        </div>
        <div className="border-b border-line p-5 sm:border-b-0 sm:border-r">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-500"><Wifi size={13} /> Test nodes</div>
          <p className="text-xs text-neutral-300">{nodes.length ? nodes.map((n) => n.name).join(", ") : "No nodes configured"}</p>
        </div>
        <div className="p-5">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-500"><Activity size={13} /> Network status</div>
          <p className="text-xs text-neutral-500">On-demand measurement only</p>
        </div>
      </div>

      {(results || error) && (
        <div className="border-t border-line px-5 py-4">
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {results && (
            <div className="grid gap-2 sm:grid-cols-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-ink-850 px-3.5 py-2.5 text-xs">
                  <span className="text-neutral-300">{r.name} <span className="text-neutral-600">· {r.host}</span></span>
                  <span className={r.ok ? "text-emerald-400" : "text-rose-400"}>
                    {r.ok ? `${r.latencyMs} ms` : "Unreachable"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
