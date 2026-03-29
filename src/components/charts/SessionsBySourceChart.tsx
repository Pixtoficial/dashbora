"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { SessionsBySource } from "@/types";
import { formatNumber } from "@/lib/utils";

interface Props {
  data: SessionsBySource[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: payload[0].payload.color }} />
        <span className="text-muted-foreground text-xs">Sessões:</span>
        <span className="font-medium">{formatNumber(payload[0].value)}</span>
      </div>
    </div>
  );
};

export function SessionsBySourceChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "hsl(240 5% 55%)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatNumber(v)}
        />
        <YAxis
          type="category"
          dataKey="source"
          tick={{ fontSize: 11, fill: "hsl(240 5% 55%)" }}
          axisLine={false}
          tickLine={false}
          width={148}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(240 4% 16%)" }} />
        <Bar dataKey="sessions" name="Sessões" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
