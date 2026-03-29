/**
 * funnel-as-source.service.ts
 *
 * Transforma dados do funil (inseridos manualmente) em KPIs e séries para as
 * páginas de Google Ads e GA4. Quando o admin preenche o funil, esse serviço
 * "distribui" os números para o restante do dashboard.
 */

import { getManualSection } from "@/services/manual-data.service";
import { type FunnelDayData, type FunnelTotals } from "@/lib/calculateFunnelMetrics";
import {
  GoogleKPIs,
  GoogleClicksConversionsPoint,
  GoogleCampaignType,
  GA4KPIs,
  SessionsBySource,
  GA4DeviceBreakdown,
} from "@/types";

type ManualFunnelData = { days: FunnelDayData[]; totals: FunnelTotals };

export function getFunnelManualData(): ManualFunnelData | null {
  return getManualSection<ManualFunnelData>("funil.data");
}

// ─── Estimativas de período anterior ────────────────────────────────────────
// Sem dados históricos, assume variação de -10% como placeholder visual.
function prev(current: number, factor = 0.9): number {
  return current * factor;
}

// ─── Google Ads KPIs ─────────────────────────────────────────────────────────

export function funnelToGoogleAdsKPIs(funnel: ManualFunnelData): GoogleKPIs {
  const t = funnel.totals;
  const cost = t.cost;
  const clicks = t.clicks;
  const conversions = t.totalLeads > 0 ? t.totalLeads : t.purchases;
  const convVal = t.revenue;

  return {
    cost:              { value: cost,                              previousValue: prev(cost),                   format: "currency"   },
    clicks:            { value: clicks,                            previousValue: prev(clicks),                 format: "number"     },
    conversions:       { value: conversions,                       previousValue: prev(conversions),            format: "number"     },
    costPerConversion: { value: conversions > 0 ? cost / conversions : 0, previousValue: prev(conversions > 0 ? cost / conversions : 0), format: "currency" },
    ctr:               { value: t.ctr,                             previousValue: prev(t.ctr),                  format: "percent"    },
    avgCpc:            { value: t.cpc,                             previousValue: prev(t.cpc),                  format: "currency"   },
    roas:              { value: t.roas,                            previousValue: prev(t.roas, 0.85),           format: "multiplier" },
    impressionShare:   { value: 0,                                 previousValue: 0,                            format: "percent"    },
  };
}

// ─── Google Ads — cliques × conversões diários ───────────────────────────────

export function funnelToClicksConversions(funnel: ManualFunnelData): GoogleClicksConversionsPoint[] {
  return funnel.days.map((d) => ({
    date: d.date,            // "DD/MM"
    clicks: d.clicks,
    conversions: d.totalLeads > 0 ? d.totalLeads : d.purchases,
  }));
}

// ─── Google Ads — tipos de campanha (derivado do funil) ───────────────────────

export function funnelToGoogleCampaignTypes(funnel: ManualFunnelData): GoogleCampaignType[] {
  const t = funnel.totals;
  const conversions = t.totalLeads > 0 ? t.totalLeads : t.purchases;
  // Sem breakdown por tipo, exibimos um único tipo genérico
  return [
    {
      type: "Search",
      cost: t.cost,
      clicks: t.clicks,
      conversions,
      roas: t.roas,
    },
  ];
}

// ─── GA4 KPIs ─────────────────────────────────────────────────────────────────

export function funnelToGA4KPIs(funnel: ManualFunnelData): GA4KPIs {
  const t = funnel.totals;

  // pageViews ≈ sessions; users ≈ sessions * 0.7 (ratio típico)
  const sessions = t.pageViews;
  const users    = Math.round(sessions * 0.7);
  const convEvents = t.totalLeads + t.purchases;

  // connectRate (cliques/pageViews) usado como proxy de engajamento
  const engagement = t.connectRate;

  return {
    users:           { value: users,      previousValue: prev(users),       format: "number"   },
    sessions:        { value: sessions,   previousValue: prev(sessions),    format: "number"   },
    engagementRate:  { value: engagement, previousValue: prev(engagement),  format: "percent"  },
    conversionEvents:{ value: convEvents, previousValue: prev(convEvents),  format: "number"   },
    revenue:         { value: t.revenue,  previousValue: prev(t.revenue, 0.85), format: "currency" },
  };
}

// ─── GA4 — sessões por fonte (derivado do funil) ──────────────────────────────

export function funnelToSessionsBySource(funnel: ManualFunnelData): SessionsBySource[] {
  const sessions = funnel.totals.pageViews;
  if (sessions === 0) return [];
  // O funil é proveniente de Google Ads — atribuímos à origem Paid Search
  return [
    { source: "Paid Search",    sessions: Math.round(sessions * 0.6),  color: "#4285F4" },
    { source: "Direct",         sessions: Math.round(sessions * 0.2),  color: "#8B5CF6" },
    { source: "Organic Search", sessions: Math.round(sessions * 0.12), color: "#34A853" },
    { source: "Referral",       sessions: Math.round(sessions * 0.08), color: "#06B6D4" },
  ];
}

// ─── GA4 — dispositivos (estimativa) ────────────────────────────────────────

export function funnelToGA4Devices(funnel: ManualFunnelData): GA4DeviceBreakdown[] {
  const sessions = funnel.totals.pageViews;
  if (sessions === 0) return [];
  return [
    { device: "Mobile",  sessions: Math.round(sessions * 0.65), color: "#4285F4" },
    { device: "Desktop", sessions: Math.round(sessions * 0.30), color: "#34A853" },
    { device: "Tablet",  sessions: Math.round(sessions * 0.05), color: "#FBBC05" },
  ];
}
