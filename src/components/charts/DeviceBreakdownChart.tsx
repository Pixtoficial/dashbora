"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { GA4DeviceBreakdown } from "@/types";
import { formatNumber } from "@/lib/utils";

interface Props { data: GA4DeviceBreakdown[]; }

export function DeviceBreakdownChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="44%" outerRadius={80} innerRadius={42} dataKey="sessions" nameKey="device" labelLine={false}
          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
            if (percent < 0.05) return null;
            const R = Math.PI / 180;
            const r = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + r * Math.cos(-midAngle * R);
            const y = cy + r * Math.sin(-midAngle * R);
            return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{`${(percent * 100).toFixed(0)}%`}</text>;
          }}
        >
          {data.map((d, i) => <Cell key={i} fill={d.color} stroke="transparent" />)}
        </Pie>
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0];
          return (
            <div className="rounded-xl border border-border bg-popover shadow-xl px-3 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: d.payload.color }} />
                <span className="font-medium">{d.name}</span>
              </div>
              <p className="text-muted-foreground mt-1">{formatNumber(d.value as number)} sessões</p>
            </div>
          );
        }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
