/**
 * calculateFunnelMetrics.ts
 *
 * Recebe dados brutos do Google Ads (por dia) e do GA4 (por dia),
 * faz o join por data e calcula todas as métricas derivadas do funil,
 * linha por linha (dia a dia).
 *
 * Outputs:
 *   - FunnelDayData[]   → array de dados por dia (para a tabela)
 *   - FunnelTotals      → soma/média do período (última coluna da tabela)
 */

import { format, eachDayOfInterval, parseISO } from "date-fns";
import type { GadsRawRow } from "./google-ads-client";
import type { GA4DayRow } from "./ga4-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FunnelDayData {
  date: string;          // "DD/MM" para exibição
  dateISO: string;       // "YYYY-MM-DD" para joins

  // ── Google Ads (fonte: Google Ads API) ────────────────────────────────
  impressions: number;
  reach: number;         // active_view_impressions (proxy) ou estimado
  frequency: number;     // impressions / reach
  ctr: number;           // % — clicks / impressions × 100
  cpmc: number;          // R$ — CPM = (cost / impressions) × 1000
  clicks: number;
  cpc: number;           // R$ — cost / clicks
  cost: number;          // R$ — cost_micros / 1_000_000

  // ── GA4 (fonte: GA4 Data API) ─────────────────────────────────────────
  pageViews: number;     // evento page_view / screenPageViews
  trackedLeads: number;  // generate_lead (rastreado via tag)
  totalLeads: number;    // generate_lead (GA4 — mesma fonte, mantido separado para clareza)
  addToCart: number;     // evento add_to_cart
  checkout: number;      // evento begin_checkout
  purchases: number;     // evento purchase / transactions
  revenue: number;       // purchase_revenue (R$)

  // ── Calculados (frontend/backend) ─────────────────────────────────────
  costPerPageView: number;        // cost / pageViews
  connectRate: number;            // (pageViews / clicks) × 100  (%)
  pageViewToContact: number;      // (pageViews / totalLeads)  (ratio x:1 ou %)
  cpl: number;                    // cost / totalLeads
  pageViewToAddToCart: number;    // (addToCart / pageViews) × 100
  addToCartToCheckout: number;    // (checkout / addToCart) × 100
  checkoutConversion: number;     // (purchases / checkout) × 100
  overallConversion: number;      // (purchases / pageViews) × 100
  cpa: number;                    // cost / purchases
  roas: number;                   // revenue / cost
}

export interface FunnelTotals extends FunnelDayData {
  // frequência e taxas são médias; demais são somas
  _isTotal: true;
}

// ─── Metric definitions para renderização ─────────────────────────────────────

export type MetricFormat =
  | "integer"    // 1.234
  | "currency"   // R$ 1.234,56
  | "percent"    // 12,34%
  | "decimal"    // 1,25
  | "multiplier" // 4,20x
  | "ratio";     // 1:1 display como x.xx

export type MetricSource = "google_ads" | "ga4" | "calculated";

export type FunnelGroup = "campaign" | "site" | "investment";

export interface FunnelMetricDef {
  key: keyof FunnelDayData;
  label: string;
  format: MetricFormat;
  source: MetricSource;
  /**
   * "campaign" = azul (métricas da campanha: até CPC)
   * "site"     = vermelho (métricas do site/LP)
   * "investment" = azul (investimento / ROAS)
   */
  funnelGroup: FunnelGroup;
  invertColor?: boolean;
  groupBefore?: string;
  formula?: string;
}

const C = "campaign" as FunnelGroup;
const S = "site"     as FunnelGroup;
const I = "investment" as FunnelGroup;

export const LEADS_FUNNEL_METRICS: FunnelMetricDef[] = [
  { key: "impressions",       label: "Impressões",            format: "integer",    source: "google_ads", funnelGroup: C, groupBefore: "Funil da Campanha" },
  { key: "reach",             label: "Alcance",               format: "integer",    source: "google_ads", funnelGroup: C },
  { key: "frequency",         label: "Frequência",            format: "decimal",    source: "google_ads", funnelGroup: C },
  { key: "ctr",               label: "CTR",                   format: "percent",    source: "google_ads", funnelGroup: C },
  { key: "cpmc",              label: "CPMC",                  format: "currency",   source: "google_ads", funnelGroup: C, invertColor: true },
  { key: "clicks",            label: "Cliques",               format: "integer",    source: "google_ads", funnelGroup: C },
  { key: "cpc",               label: "CPC",                   format: "currency",   source: "google_ads", funnelGroup: C, invertColor: true },
  { key: "pageViews",         label: "Page View",             format: "integer",    source: "ga4",        funnelGroup: S, groupBefore: "Funil do Site / LP" },
  { key: "costPerPageView",   label: "Custo por Page View",   format: "currency",   source: "calculated", funnelGroup: S, invertColor: true, formula: "Investimento ÷ Page Views" },
  { key: "connectRate",       label: "Connect Rate",          format: "percent",    source: "calculated", funnelGroup: S, formula: "Page Views ÷ Cliques × 100" },
  { key: "pageViewToContact", label: "Page View × Contato",  format: "decimal",    source: "calculated", funnelGroup: S, formula: "Page Views ÷ Leads" },
  { key: "trackedLeads",      label: "Leads Rastreados",      format: "integer",    source: "ga4",        funnelGroup: S },
  { key: "totalLeads",        label: "Leads Totais (GA4)",    format: "integer",    source: "ga4",        funnelGroup: S },
  { key: "cpl",               label: "CPL",                   format: "currency",   source: "calculated", funnelGroup: S, invertColor: true, formula: "Investimento ÷ Leads Totais" },
  { key: "cost",              label: "Investimento",          format: "currency",   source: "google_ads", funnelGroup: I, invertColor: true, groupBefore: "Investimento" },
];

export const ECOMMERCE_FUNNEL_METRICS: FunnelMetricDef[] = [
  { key: "impressions",         label: "Impressões",              format: "integer",    source: "google_ads", funnelGroup: C, groupBefore: "Funil da Campanha" },
  { key: "reach",               label: "Alcance",                 format: "integer",    source: "google_ads", funnelGroup: C },
  { key: "frequency",           label: "Frequência",              format: "decimal",    source: "google_ads", funnelGroup: C },
  { key: "ctr",                 label: "CTR",                     format: "percent",    source: "google_ads", funnelGroup: C },
  { key: "cpmc",                label: "CPMC",                    format: "currency",   source: "google_ads", funnelGroup: C, invertColor: true },
  { key: "clicks",              label: "Cliques",                 format: "integer",    source: "google_ads", funnelGroup: C },
  { key: "cpc",                 label: "CPC",                     format: "currency",   source: "google_ads", funnelGroup: C, invertColor: true },
  { key: "pageViews",           label: "Page View",               format: "integer",    source: "ga4",        funnelGroup: S, groupBefore: "Funil do Site / LP" },
  { key: "costPerPageView",     label: "Custo por Page View",     format: "currency",   source: "calculated", funnelGroup: S, invertColor: true },
  { key: "totalLeads",          label: "Leads",                   format: "integer",    source: "ga4",        funnelGroup: S },
  { key: "cpl",                 label: "CPL",                     format: "currency",   source: "calculated", funnelGroup: S, invertColor: true },
  { key: "connectRate",         label: "Connect Rate",            format: "percent",    source: "calculated", funnelGroup: S },
  { key: "addToCart",           label: "Add to Cart",             format: "integer",    source: "ga4",        funnelGroup: S },
  { key: "pageViewToAddToCart", label: "Page View × Add to Cart", format: "percent",    source: "calculated", funnelGroup: S, formula: "Add to Cart ÷ Page Views × 100" },
  { key: "checkout",            label: "Checkout",                format: "integer",    source: "ga4",        funnelGroup: S },
  { key: "addToCartToCheckout", label: "Add to Cart × Checkout",  format: "percent",    source: "calculated", funnelGroup: S },
  { key: "checkoutConversion",  label: "Conversão de Checkout",   format: "percent",    source: "calculated", funnelGroup: S },
  { key: "overallConversion",   label: "Conversão Geral",         format: "percent",    source: "calculated", funnelGroup: S },
  { key: "cpa",                 label: "CPA",                     format: "currency",   source: "calculated", funnelGroup: S, invertColor: true },
  { key: "purchases",           label: "Vendas",                  format: "integer",    source: "ga4",        funnelGroup: S },
  { key: "revenue",             label: "Faturamento",             format: "currency",   source: "ga4",        funnelGroup: S, groupBefore: "Resultado" },
  { key: "cost",                label: "Investimento",            format: "currency",   source: "google_ads", funnelGroup: I, invertColor: true, groupBefore: "Investimento" },
  { key: "roas",                label: "ROAS",                    format: "multiplier", source: "calculated", funnelGroup: I, formula: "Faturamento ÷ Investimento" },
];

// ─── Core calculation ─────────────────────────────────────────────────────────

export function calculateFunnelMetrics(
  gadsByDate: Map<string, GadsRawRow>,
  ga4ByDate: Map<string, GA4DayRow>,
  startDate: Date,
  endDate: Date
): FunnelDayData[] {
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return days.map((day) => {
    const isoDate = format(day, "yyyy-MM-dd");
    const gads = gadsByDate.get(isoDate);
    const ga4 = ga4ByDate.get(isoDate);

    // ── Google Ads raw ────────────────────────────────────────────────────
    const costMicros = gads?.costMicros ?? 0;
    const cost = costMicros / 1_000_000;
    const impressions = gads?.impressions ?? 0;
    const clicks = gads?.clicks ?? 0;
    // Reach: usa active_view_impressions como proxy (display/video)
    // Se for 0 (search), estimamos como impressions × 0.85 (conservador)
    const rawReach = gads?.activeViewImpressions ?? 0;
    const reach = rawReach > 0 ? rawReach : Math.round(impressions * 0.85);
    const frequency = reach > 0 ? impressions / reach : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpmc = impressions > 0 ? (cost / impressions) * 1000 : 0;
    const cpc = clicks > 0 ? cost / clicks : 0;

    // ── GA4 raw ───────────────────────────────────────────────────────────
    const pageViews = ga4?.pageViews ?? 0;
    const totalLeads = ga4?.generateLead ?? 0;
    const trackedLeads = totalLeads; // mesma fonte; campo separado para clareza da UI
    const addToCart = ga4?.addToCart ?? 0;
    const checkout = ga4?.beginCheckout ?? 0;
    const purchases = ga4?.purchase ?? 0;
    const revenue = ga4?.purchaseRevenue ?? 0;

    // ── Calculated ────────────────────────────────────────────────────────
    const costPerPageView = pageViews > 0 ? cost / pageViews : 0;
    const connectRate = clicks > 0 ? (pageViews / clicks) * 100 : 0;
    const pageViewToContact = totalLeads > 0 ? pageViews / totalLeads : 0;
    const cpl = totalLeads > 0 ? cost / totalLeads : 0;
    const pageViewToAddToCart = pageViews > 0 ? (addToCart / pageViews) * 100 : 0;
    const addToCartToCheckout = addToCart > 0 ? (checkout / addToCart) * 100 : 0;
    const checkoutConversion = checkout > 0 ? (purchases / checkout) * 100 : 0;
    const overallConversion = pageViews > 0 ? (purchases / pageViews) * 100 : 0;
    const cpa = purchases > 0 ? cost / purchases : 0;
    const roas = cost > 0 ? revenue / cost : 0;

    return {
      date: format(day, "dd/MM"),
      dateISO: isoDate,
      impressions, reach, frequency, ctr, cpmc, clicks, cpc, cost,
      pageViews, trackedLeads, totalLeads, addToCart, checkout, purchases, revenue,
      costPerPageView, connectRate, pageViewToContact, cpl,
      pageViewToAddToCart, addToCartToCheckout, checkoutConversion,
      overallConversion, cpa, roas,
    };
  });
}

// ─── Totals row ───────────────────────────────────────────────────────────────

export function calculateFunnelTotals(days: FunnelDayData[]): FunnelTotals {
  if (days.length === 0) {
    return { ...emptyDay(), date: "Total", dateISO: "total", _isTotal: true };
  }

  const sum = (key: keyof FunnelDayData) =>
    days.reduce((acc, d) => acc + (Number(d[key]) || 0), 0);
  const avg = (key: keyof FunnelDayData) => sum(key) / days.length;

  const cost = sum("cost");
  const impressions = sum("impressions");
  const reach = sum("reach");
  const clicks = sum("clicks");
  const pageViews = sum("pageViews");
  const totalLeads = sum("totalLeads");
  const addToCart = sum("addToCart");
  const checkout = sum("checkout");
  const purchases = sum("purchases");
  const revenue = sum("revenue");

  return {
    date: "TOTAL",
    dateISO: "total",
    _isTotal: true,
    impressions,
    reach,
    frequency: reach > 0 ? impressions / reach : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpmc: impressions > 0 ? (cost / impressions) * 1000 : 0,
    clicks,
    cpc: clicks > 0 ? cost / clicks : 0,
    cost,
    pageViews,
    trackedLeads: sum("trackedLeads"),
    totalLeads,
    addToCart,
    checkout,
    purchases,
    revenue,
    costPerPageView: pageViews > 0 ? cost / pageViews : 0,
    connectRate: clicks > 0 ? (pageViews / clicks) * 100 : 0,
    pageViewToContact: totalLeads > 0 ? pageViews / totalLeads : 0,
    cpl: totalLeads > 0 ? cost / totalLeads : 0,
    pageViewToAddToCart: pageViews > 0 ? (addToCart / pageViews) * 100 : 0,
    addToCartToCheckout: addToCart > 0 ? (checkout / addToCart) * 100 : 0,
    checkoutConversion: checkout > 0 ? (purchases / checkout) * 100 : 0,
    overallConversion: pageViews > 0 ? (purchases / pageViews) * 100 : 0,
    cpa: purchases > 0 ? cost / purchases : 0,
    roas: cost > 0 ? revenue / cost : 0,
  };
}

// ─── Recalculate derived fields from raw fields ───────────────────────────────

export function recalculateDayFromRaw(day: FunnelDayData): FunnelDayData {
  const {
    impressions, reach, clicks, cost,
    pageViews, totalLeads, addToCart, checkout, purchases, revenue,
  } = day;

  return {
    ...day,
    frequency:           reach > 0        ? impressions / reach               : 0,
    ctr:                 impressions > 0  ? (clicks / impressions) * 100      : 0,
    cpmc:                impressions > 0  ? (cost / impressions) * 1000       : 0,
    cpc:                 clicks > 0       ? cost / clicks                     : 0,
    costPerPageView:     pageViews > 0    ? cost / pageViews                  : 0,
    connectRate:         clicks > 0         ? (pageViews / clicks) * 100        : 0,
    pageViewToContact:   totalLeads > 0   ? pageViews / totalLeads            : 0,
    cpl:                 totalLeads > 0   ? cost / totalLeads                 : 0,
    pageViewToAddToCart: pageViews > 0    ? (addToCart / pageViews) * 100     : 0,
    addToCartToCheckout: addToCart > 0    ? (checkout / addToCart) * 100      : 0,
    checkoutConversion:  checkout > 0     ? (purchases / checkout) * 100      : 0,
    overallConversion:   pageViews > 0    ? (purchases / pageViews) * 100     : 0,
    cpa:                 purchases > 0    ? cost / purchases                  : 0,
    roas:                cost > 0         ? revenue / cost                    : 0,
  };
}

function emptyDay(): FunnelDayData {
  return {
    date: "", dateISO: "",
    impressions: 0, reach: 0, frequency: 0, ctr: 0, cpmc: 0,
    clicks: 0, cpc: 0, cost: 0, pageViews: 0, trackedLeads: 0, totalLeads: 0,
    addToCart: 0, checkout: 0, purchases: 0, revenue: 0,
    costPerPageView: 0, connectRate: 0, pageViewToContact: 0, cpl: 0,
    pageViewToAddToCart: 0, addToCartToCheckout: 0, checkoutConversion: 0,
    overallConversion: 0, cpa: 0, roas: 0,
  };
}

// ─── Value formatter ──────────────────────────────────────────────────────────

export function formatMetricValue(value: number, format: MetricFormat): string {
  if (!isFinite(value) || isNaN(value)) return "—";
  switch (format) {
    case "integer":
      return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    case "currency":
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    case "percent":
      return `${value.toFixed(2).replace(".", ",")}%`;
    case "decimal":
      return value.toFixed(2).replace(".", ",");
    case "multiplier":
      return `${value.toFixed(2).replace(".", ",")}×`;
    case "ratio":
      return `${value.toFixed(1).replace(".", ",")}:1`;
    default:
      return String(value);
  }
}
