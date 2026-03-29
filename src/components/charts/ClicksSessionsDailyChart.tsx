"use client";

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { OverviewDailyPoint } from "@/types";
import { formatNumber } from "@/lib/utils";

interface Props { data: OverviewDailyPoint[]; }

export function ClicksSessionsDailyChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }} axisLine={false} tickLine={false} tickFormatter={formatNumber} width={48} />
        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }} axisLine={false} tickLine={false} tickFormatter={formatNumber} width={44} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-xl border border-border bg-popover shadow-xl px-3 py-2.5 text-xs space-y-1">
                <p className="font-semibold text-muted-foreground">{label}</p>
                {payload.map((p: any) => (
                  <div key={p.dataKey} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-muted-foreground">{p.name}:</span>
                    <span className="font-medium">{formatNumber(p.value)}</span>
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
        <Bar yAxisId="l" dataKey="clicks" name="Cliques" fill="#4285F4" opacity={0.8} radius={[3, 3, 0, 0]} />
        <Line yAxisId="r" type="monotone" dataKey="sessions" name="Sessões" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
