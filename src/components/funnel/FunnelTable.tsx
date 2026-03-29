"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import {
  type FunnelDayData,
  type FunnelTotals,
  type FunnelMetricDef,
  type MetricSource,
  type FunnelGroup,
  formatMetricValue,
} from "@/lib/calculateFunnelMetrics";

const RAW_FIELDS = new Set<keyof FunnelDayData>([
  "impressions", "reach", "clicks", "cost",
  "pageViews", "trackedLeads", "totalLeads",
  "addToCart", "checkout", "purchases", "revenue",
]);

interface Props {
  metrics: FunnelMetricDef[];
  days: FunnelDayData[];
  totals: FunnelTotals;
  editMode?: boolean;
  onDayChange?: (dayIndex: number, field: keyof FunnelDayData, value: number) => void;
}

const SOURCE_COLORS: Record<MetricSource, string> = {
  google_ads: "text-[#4285F4]",
  ga4:        "text-[#E37400]",
  calculated: "text-violet-600",
};

const SOURCE_BADGE: Record<MetricSource, string> = {
  google_ads: "bg-blue-50 text-blue-600 border-blue-200",
  ga4:        "bg-orange-50 text-orange-600 border-orange-200",
  calculated: "bg-violet-50 text-violet-600 border-violet-200",
};

const SOURCE_LABELS: Record<MetricSource, string> = {
  google_ads: "GAds",
  ga4:        "GA4",
  calculated: "Calc",
};

const GROUP_BORDER_COLOR: Record<FunnelGroup, string> = {
  campaign:   "#4285F4",
  investment: "#4285F4",
  site:       "#f43f5e",
};

const GROUP_HEADER_CLASS: Record<string, string> = {
  "Funil da Campanha":  "bg-blue-50 text-blue-700",
  "Funil do Site / LP": "bg-rose-50 text-rose-700",
  "Investimento":       "bg-blue-50 text-blue-700",
  "Resultado":          "bg-rose-50 text-rose-700",
};

export function FunnelTable({ metrics, days, totals, editMode = false, onDayChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleDays = days.slice(0, 31);

  return (
    <div className="relative">
      {editMode && (
        <div className="mb-3 px-1 flex items-center gap-2 text-xs text-amber-600">
          <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1 font-medium">
            ✏️ Modo edição — altere os campos em azul/laranja (fonte). Campos calculados atualizam automaticamente.
          </span>
        </div>
      )}

      <div ref={scrollRef} className="overflow-x-auto overflow-y-visible rounded-lg" style={{ maxWidth: "100%" }}>
        <table className="w-max min-w-full text-xs border-collapse bg-white">
          {/* ── Column headers ── */}
          <thead>
            <tr className="border-b-2 border-zinc-300">
              <th className="sticky left-0 z-20 bg-white border-r-2 border-zinc-300 text-left px-4 py-3 font-semibold text-zinc-500 min-w-[220px] whitespace-nowrap uppercase tracking-wide text-[10px]">
                Métrica
              </th>
              <th className="sticky left-[220px] z-20 bg-white border-r border-zinc-200 text-center px-3 py-3 font-semibold text-zinc-500 min-w-[44px] whitespace-nowrap uppercase tracking-wide text-[10px]">
                Fonte
              </th>
              {visibleDays.map((day) => (
                <th key={day.dateISO} className="bg-white text-center px-3 py-3 font-semibold text-zinc-500 min-w-[88px] whitespace-nowrap border-r border-zinc-200 last:border-r-0 text-[10px]">
                  {day.date}
                </th>
              ))}
              <th className="sticky right-0 z-20 bg-blue-50 border-l-2 border-blue-200 text-center px-3 py-3 font-bold text-blue-700 min-w-[100px] whitespace-nowrap text-[10px] uppercase tracking-wide">
                TOTAL
              </th>
            </tr>
          </thead>

          <tbody>
            {metrics.map((metric, idx) => {
              const isGroup = !!metric.groupBefore;
              const accentColor = GROUP_BORDER_COLOR[metric.funnelGroup];
              const rowBg = idx % 2 === 0 ? "bg-white" : "bg-zinc-50";
              const isRaw = RAW_FIELDS.has(metric.key);

              return (
                <>
                  {isGroup && (
                    <tr key={`group-${idx}`}>
                      <td colSpan={visibleDays.length + 3}
                        className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-y-2 border-zinc-200",
                          GROUP_HEADER_CLASS[metric.groupBefore!] ?? "bg-zinc-100 text-zinc-600")}>
                        {metric.groupBefore}
                      </td>
                    </tr>
                  )}

                  <tr key={metric.key} className={cn("border-b border-zinc-200 transition-colors hover:bg-zinc-100", rowBg)}>
                    {/* Metric name — sticky */}
                    <td className="sticky left-0 z-10 bg-white border-r-2 border-zinc-200 border-l-4 px-4 py-2.5 whitespace-nowrap font-medium"
                      style={{ borderLeftColor: accentColor }}>
                      <div className="flex flex-col gap-0.5">
                        <span className={SOURCE_COLORS[metric.source]}>{metric.label}</span>
                        {metric.formula && <span className="text-[9px] text-zinc-400 font-normal">{metric.formula}</span>}
                      </div>
                    </td>

                    {/* Source badge — sticky */}
                    <td className="sticky left-[220px] z-10 bg-white border-r border-zinc-200 px-2 py-2.5 text-center">
                      <span className={cn("inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold border leading-none", SOURCE_BADGE[metric.source])}>
                        {SOURCE_LABELS[metric.source]}
                      </span>
                    </td>

                    {/* Day values */}
                    {visibleDays.map((day, i) => {
                      const raw = day[metric.key] as number;
                      const isZero = raw === 0;

                      if (editMode && isRaw) {
                        return (
                          <td key={day.dateISO} className="px-1.5 py-1 border-r border-zinc-200 last:border-r-0">
                            <input
                              type="number"
                              value={raw}
                              min={0}
                              step="any"
                              onChange={(e) =>
                                onDayChange?.(i, metric.key, parseFloat(e.target.value) || 0)
                              }
                              className="w-full h-7 px-1.5 text-right font-mono text-xs rounded border border-blue-300 bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            />
                          </td>
                        );
                      }

                      return (
                        <td key={day.dateISO}
                          className={cn(
                            "text-right px-3 py-2.5 font-mono border-r border-zinc-200 last:border-r-0",
                            isZero ? "text-zinc-300" : "text-zinc-800",
                            editMode && !isRaw && "bg-zinc-50/60 text-zinc-500 italic",
                          )}>
                          {formatMetricValue(raw, metric.format)}
                        </td>
                      );
                    })}

                    {/* Total — sticky right */}
                    <td className={cn("sticky right-0 z-10 text-right px-3 py-2.5 font-mono font-semibold border-l-2 border-blue-200",
                      metric.source === "calculated" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700")}>
                      {formatMetricValue(totals[metric.key] as number, metric.format)}
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-4 px-1 text-[11px] text-muted-foreground">
        {(["google_ads", "ga4", "calculated"] as MetricSource[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("inline-block rounded px-1.5 py-0.5 border text-[9px] font-bold", SOURCE_BADGE[s])}>{SOURCE_LABELS[s]}</span>
            {s === "google_ads" ? "Google Ads API" : s === "ga4" ? "GA4 Data API" : "Campo calculado"}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-l-4 bg-white border border-zinc-200" style={{ borderLeftColor: "#4285F4" }} />
          Campanha / Investimento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-l-4 bg-white border border-zinc-200" style={{ borderLeftColor: "#f43f5e" }} />
          Site / LP
        </span>
        <span className="ml-auto italic text-[10px]">Scroll horizontal para ver mais dias →</span>
      </div>
    </div>
  );
}
