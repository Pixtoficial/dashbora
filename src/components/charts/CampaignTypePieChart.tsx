"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { GoogleCampaignType } from "@/types";
import { formatCurrency } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  Search:            "#4285F4",
  "Performance Max": "#34A853",
  Display:           "#FBBC05",
  YouTube:           "#EA4335",
};

interface Props {
  data: GoogleCampaignType[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl border border-border bg-popover shadow-xl px-4 py-3 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: d.payload.color }} />
        <span className="font-medium">{d.name}</span>
      </div>
      <p className="text-muted-foreground text-xs">{formatCurrency(d.value)}</p>
    </div>
  );
};

const renderCustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: any) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function CampaignTypePieChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.type,
    value: d.cost,
    color: TYPE_COLORS[d.type] ?? "#888",
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="44%"
          outerRadius={88}
          innerRadius={46}
          dataKey="value"
          nameKey="name"
          labelLine={false}
          label={renderCustomLabel}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
