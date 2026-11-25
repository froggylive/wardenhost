"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function RevenueChart({ data }: { data: Array<{ label: string; revenue: number }> }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#222" vertical={false} />
          <XAxis dataKey="label" stroke="#666" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis stroke="#666" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{ background: "#111", border: "1px solid #262626", borderRadius: 10, fontSize: 12 }}
            formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]}
          />
          <Bar dataKey="revenue" fill="#e5e5e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
