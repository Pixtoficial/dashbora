"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { OverviewDailyPoint } from "@/types";

interface Props {
  data: OverviewDailyPoint[];
  dataKey: keyof OverviewDailyPoint;
  color: string;
  label: string;
  formatter?: (v: number) => string;
}

export function DailyLineChart({ data, dataKey, color, label, formatter }: Props) {
  const fmt = formatter ?? ((v: number) => v.toLocaleString("pt-BR"));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }} axisLine={false} tickLine={false} tickFormatter={fmt} width={52} />
        <Tooltip
          content={({ active, payload, label: lbl }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-xl border border-border bg-popover shadow-xl px-3 py-2.5 text-xs space-y-1">
                <p className="font-semibold text-muted-foreground">{lbl}</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-muted-foreground">{label}:</span>
                  <span className="font-medium">{fmt(payload[0].value as number)}</span>
                </div>
              </div>
            );
          }}
        />
        <Line type="monotone" dataKey={dataKey as string} name={label} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
