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
import { MetaCampaign } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  campaigns: MetaCampaign[];
}

const COLORS = ["#8B5CF6", "#6D4FCC", "#5540A0", "#3E3178", "#2A2150"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover shadow-xl px-4 py-3 text-sm space-y-1">
      <p className="font-semibold text-xs text-muted-foreground mb-1 max-w-[200px] truncate">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">Gasto:</span>
        <span className="font-medium">{formatCurrency(payload[0].value)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">ROAS:</span>
        <span className="font-medium">{payload[1]?.value?.toFixed(2)}x</span>
      </div>
    </div>
  );
};

export function TopCampaignsChart({ campaigns }: Props) {
  const top5 = [...campaigns]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
    .map((c) => ({
      name: c.name.length > 22 ? c.name.slice(0, 22) + "…" : c.name,
      spend: c.spend,
      roas: c.roas,
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={top5} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "hsl(240 5% 55%)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}K`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "hsl(240 5% 55%)" }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(240 4% 16%)" }} />
        <Bar dataKey="spend" name="Gasto" radius={[0, 4, 4, 0]}>
          {top5.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
        <Bar dataKey="roas" name="ROAS" radius={[0, 4, 4, 0]} fill="#10B981" />
      </BarChart>
    </ResponsiveContainer>
  );
}
