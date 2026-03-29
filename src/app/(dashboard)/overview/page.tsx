"use client";

import { useState, useEffect, useMemo } from "react";
import { startOfWeek, addDays, isBefore, isAfter, startOfDay } from "date-fns";
import { DollarSign, Users, Tag, MousePointer, Eye, Percent, Monitor, BarChart2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDateRange } from "@/contexts/DateContext";
import { KPICard, KPICardSkeleton } from "@/components/dashboard/KPICard";
import { DailyBarChart } from "@/components/charts/DailyBarChart";
import { DailyLineChart } from "@/components/charts/DailyLineChart";
import { ClicksSessionsDailyChart } from "@/components/charts/ClicksSessionsDailyChart";
import { WeekComparisonChart, type WeekPoint } from "@/components/charts/WeekComparisonChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOverviewKPIs, fetchOverviewDailySeries } from "@/services/overview.service";
import { getManualSection, setManualSection } from "@/services/manual-data.service";
import type { OverviewKPIs, OverviewDailyPoint } from "@/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

type Tab = "resumo" | "diario";

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/* Build two 7-day series (Mon–Sun) from a daily series array.
   The series must cover at least 14 days for both weeks to be present. */
function buildWeekComparison(
  daily: OverviewDailyPoint[],
  key: keyof OverviewDailyPoint
): WeekPoint[] {
  const today = startOfDay(new Date());

  // Current week: Monday of this week
  const thisMonday = startOfWeek(today, { weekStartsOn: 1 });
  // Previous week: Monday 7 days before
  const prevMonday = addDays(thisMonday, -7);

  // We need the raw dates. daily only has "dd/MM" strings — rebuild using
  // fetchOverviewDailySeries which is always called with dateRange. Since we
  // re-fetch a 14-day window independently here, we use the indices by
  // position relative to the most recent 14 entries available.
  // Simpler: slice the last 14 points and treat index 0–6 as prev week, 7–13 as current.
  const last14 = daily.slice(-14);
  const prevWeek = last14.slice(0, 7);
  const currWeek = last14.slice(7);

  return DAY_LABELS.map((day, i) => ({
    day,
    previous: (prevWeek[i]?.[key] as number) ?? 0,
    current: currWeek[i] !== undefined ? (currWeek[i][key] as number) : null,
  }));
}

export default function OverviewPage() {
  const { user } = useAuth();
  const { dateRange } = useDateRange();
  const [tab, setTab] = useState<Tab>("resumo");
  const [kpis, setKpis] = useState<OverviewKPIs | null>(null);
  const [daily, setDaily] = useState<OverviewDailyPoint[]>([]);
  const [weekly14, setWeekly14] = useState<OverviewDailyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    const uid = user.role === "viewer" ? "user-1" : user.id;
    setLoading(true);
    const manual = getManualSection<OverviewKPIs>("overview.kpis");

    // Fixed 14-day range for week comparison (always last 14 days)
    const today = startOfDay(new Date());
    const weekRange14 = {
      startDate: addDays(today, -13),
      endDate:   today,
      preset: "custom" as const,
      label: "14 dias",
    };

    Promise.all([
      manual ? Promise.resolve(manual) : fetchOverviewKPIs(uid, dateRange),
      fetchOverviewDailySeries(uid, dateRange),
      fetchOverviewDailySeries(uid, weekRange14),
    ]).then(([k, d, w14]) => {
      setKpis(k);
      setDaily(d);
      setWeekly14(w14);
      setLoading(false);
    });
  }, [user, dateRange]);

  function saveKPI(field: keyof OverviewKPIs) {
    return (value: number, previousValue: number) => {
      if (!kpis) return;
      const updated = { ...kpis, [field]: { ...kpis[field], value, previousValue } };
      setKpis(updated);
      setManualSection("overview.kpis", updated);
    };
  }

  const weekInvestment  = useMemo(() => buildWeekComparison(weekly14, "investment"),  [weekly14]);
  const weekLeads       = useMemo(() => buildWeekComparison(weekly14, "leads"),       [weekly14]);
  const weekClicks      = useMemo(() => buildWeekComparison(weekly14, "clicks"),      [weekly14]);
  const weekImpressions = useMemo(() => buildWeekComparison(weekly14, "impressions"), [weekly14]);

  const skeleton200 = <Skeleton className="h-[200px] w-full" />;

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="inline-flex rounded-xl border border-border p-1 bg-card gap-1">
        {(["resumo", "diario"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
            {t === "resumo" ? "Resumo" : "Visão Diária"}
          </button>
        ))}
      </div>

      {/* ══ RESUMO ══ */}
      {tab === "resumo" && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading || !kpis ? (
              Array.from({ length: 8 }).map((_, i) => <KPICardSkeleton key={i} />)
            ) : (
              <>
                <KPICard title="Investimento"     data={kpis.totalSpend}       delay={0}    icon={<DollarSign   className="w-3.5 h-3.5" />} invertTrend isEditable={isAdmin} onSave={saveKPI("totalSpend")} />
                <KPICard title="Total de Leads"    data={kpis.totalLeads}       delay={0.04} icon={<Users        className="w-3.5 h-3.5" />} isEditable={isAdmin} onSave={saveKPI("totalLeads")} />
                <KPICard title="CPL"               data={kpis.cpl}             delay={0.08} icon={<Tag          className="w-3.5 h-3.5" />} invertTrend isEditable={isAdmin} onSave={saveKPI("cpl")} />
                <KPICard title="Total de Cliques"  data={kpis.totalClicks}      delay={0.12} icon={<MousePointer className="w-3.5 h-3.5" />} isEditable={isAdmin} onSave={saveKPI("totalClicks")} />
                <KPICard title="Impressões"        data={kpis.totalImpressions} delay={0.16} icon={<Eye          className="w-3.5 h-3.5" />} isEditable={isAdmin} onSave={saveKPI("totalImpressions")} />
                <KPICard title="CTR"               data={kpis.ctr}             delay={0.20} icon={<Percent      className="w-3.5 h-3.5" />} isEditable={isAdmin} onSave={saveKPI("ctr")} />
                <KPICard title="Page Views Totais" data={kpis.totalPageViews}   delay={0.24} icon={<Monitor      className="w-3.5 h-3.5" />} isEditable={isAdmin} onSave={saveKPI("totalPageViews")} />
                <KPICard title="CPM"               data={kpis.cpm}             delay={0.28} icon={<BarChart2    className="w-3.5 h-3.5" />} invertTrend isEditable={isAdmin} onSave={saveKPI("cpm")} />
              </>
            )}
          </div>

          {/* ── Week comparison section ── */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Comparativo Semana Atual vs. Semana Anterior</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Segunda a domingo · linha sólida = semana atual · linha tracejada = semana anterior
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Investimento</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || weekly14.length < 7 ? skeleton200 : (
                    <WeekComparisonChart data={weekInvestment} label="Investimento" formatter={formatCurrency} color="#8B5CF6" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || weekly14.length < 7 ? skeleton200 : (
                    <WeekComparisonChart data={weekLeads} label="Leads" formatter={formatNumber} color="#10B981" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliques</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || weekly14.length < 7 ? skeleton200 : (
                    <WeekComparisonChart data={weekClicks} label="Cliques" formatter={formatNumber} color="#4285F4" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Impressões</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || weekly14.length < 7 ? skeleton200 : (
                    <WeekComparisonChart data={weekImpressions} label="Impressões" formatter={formatNumber} color="#F59E0B" />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ══ VISÃO DIÁRIA ══ */}
      {tab === "diario" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Valor Investido por Dia</CardTitle></CardHeader><CardContent>{loading || !daily.length ? skeleton200 : <DailyBarChart data={daily} dataKey="investment" color="#8B5CF6" label="Investimento" formatter={formatCurrency} />}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">CTR por Dia</CardTitle></CardHeader><CardContent>{loading || !daily.length ? skeleton200 : <DailyLineChart data={daily} dataKey="ctr" color="#F59E0B" label="CTR" formatter={(v) => `${v.toFixed(2)}%`} />}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Impressões por Dia</CardTitle></CardHeader><CardContent>{loading || !daily.length ? skeleton200 : <DailyBarChart data={daily} dataKey="impressions" color="#4285F4" label="Impressões" formatter={formatNumber} />}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">CPM por Dia</CardTitle></CardHeader><CardContent>{loading || !daily.length ? skeleton200 : <DailyLineChart data={daily} dataKey="cpm" color="#EF4444" label="CPM" formatter={formatCurrency} />}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Cliques e Sessões por Dia</CardTitle></CardHeader><CardContent>{loading || !daily.length ? skeleton200 : <ClicksSessionsDailyChart data={daily} />}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Geração de Leads por Dia</CardTitle></CardHeader><CardContent>{loading || !daily.length ? skeleton200 : <DailyBarChart data={daily} dataKey="leads" color="#10B981" label="Leads" formatter={formatNumber} />}</CardContent></Card>
        </div>
      )}
    </div>
  );
}
