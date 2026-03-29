/**
 * funnel.service.ts
 *
 * Busca dados de Google Ads + GA4 via API Routes internas do Next.js,
 * faz o join por data e aplica calculateFunnelMetrics.
 *
 * As API Routes (/api/google-ads e /api/ga4) escolhem automaticamente
 * entre dados reais e mock conforme NEXT_PUBLIC_DATA_MODE.
 */

import { format } from "date-fns";
import type { DateRange } from "@/types";
import type { GadsRawRow } from "@/lib/google-ads-client";
import type { GA4DayRow } from "@/lib/ga4-client";
import {
  calculateFunnelMetrics,
  calculateFunnelTotals,
  type FunnelDayData,
  type FunnelTotals,
} from "@/lib/calculateFunnelMetrics";

export interface FunnelData {
  days: FunnelDayData[];
  totals: FunnelTotals;
  source: { gads: string; ga4: string };
}

function fmt(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

async function fetchRoute<T>(url: string): Promise<{ data: T; source: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFunnelData(
  userId: string,
  dateRange: DateRange
): Promise<FunnelData> {
  const start = fmt(dateRange.startDate);
  const end = fmt(dateRange.endDate);
  const base = typeof window !== "undefined" ? "" : "http://localhost:3000";

  const [gadsRes, ga4Res] = await Promise.all([
    fetchRoute<GadsRawRow[]>(
      `${base}/api/google-ads?startDate=${start}&endDate=${end}&userId=${userId}`
    ),
    fetchRoute<GA4DayRow[]>(
      `${base}/api/ga4?startDate=${start}&endDate=${end}&userId=${userId}&report=daily`
    ),
  ]);

  // Build maps keyed by ISO date
  const gadsByDate = new Map<string, GadsRawRow>(
    (gadsRes.data ?? []).map((r) => [r.segmentsDate, r])
  );

  const ga4ByDate = new Map<string, GA4DayRow>(
    (ga4Res.data ?? []).map((r) => [r.date, r])
  );

  const days = calculateFunnelMetrics(
    gadsByDate,
    ga4ByDate,
    dateRange.startDate,
    dateRange.endDate
  );

  const totals = calculateFunnelTotals(days);

  return {
    days,
    totals,
    source: { gads: gadsRes.source, ga4: ga4Res.source },
  };
}
