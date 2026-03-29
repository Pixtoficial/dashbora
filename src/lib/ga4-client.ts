/**
 * Google Analytics 4 — Data API Client
 * SDK: @google-analytics/data
 * Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
 *
 * Auth: Service Account
 * Set env vars: GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY
 *   OR: GOOGLE_APPLICATION_CREDENTIALS (caminho para JSON da service account)
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (_client) return _client;

  // Opção A: GOOGLE_APPLICATION_CREDENTIALS aponta para arquivo JSON
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    _client = new BetaAnalyticsDataClient();
    return _client;
  }

  // Opção B: credenciais inline (recomendado para Vercel/serverless)
  if (process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY) {
    _client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GA4_CLIENT_EMAIL,
        // Vercel codifica \n em strings de env; decodificamos aqui
        private_key: process.env.GA4_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
    });
    return _client;
  }

  throw new Error(
    "Credenciais GA4 não configuradas. Defina GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY " +
    "ou GOOGLE_APPLICATION_CREDENTIALS no .env.local."
  );
}

// ─── Raw result types ─────────────────────────────────────────────────────────

export interface GA4DayRow {
  date: string;           // "YYYYMMDD" → convertemos para "YYYY-MM-DD"
  pageViews: number;      // evento page_view
  sessions: number;
  activeUsers: number;
  newUsers: number;
  engagementRate: number; // 0–1 decimal
  generateLead: number;   // evento generate_lead (count)
  addToCart: number;      // evento add_to_cart
  beginCheckout: number;  // evento begin_checkout
  purchase: number;       // evento purchase (transações)
  purchaseRevenue: number;// R$ de receita e-commerce
}

export interface GA4PageRow {
  pagePath: string;
  pageTitle: string;
  screenPageViews: number;
  sessions: number;
  engagementRate: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converte "YYYYMMDD" → "YYYY-MM-DD" */
function parseGA4Date(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function dim(row: any, name: string): string {
  return row.dimensionValues?.find((d: any) => d === name)?.value ?? "";
}

function met(row: any, index: number): number {
  return Number(row.metricValues?.[index]?.value ?? 0);
}

// ─── Daily Metrics (all events in one request) ────────────────────────────────

/**
 * Retorna métricas diárias de GA4 incluindo eventos customizados
 * (generate_lead, add_to_cart, begin_checkout, purchase).
 *
 * Strategy: two requests
 *   1. Standard metrics by date
 *   2. Event counts by date (filtered by eventName)
 */
export async function fetchGA4DailyMetrics(
  startDate: string, // "YYYY-MM-DD"
  endDate: string,
  propertyId?: string
): Promise<GA4DayRow[]> {
  const propId = propertyId ?? process.env.GA4_PROPERTY_ID;
  if (!propId) throw new Error("GA4_PROPERTY_ID não configurado.");

  const client = getClient();

  // Request 1: standard metrics by date
  const [standardRes] = await client.runReport({
    property: `properties/${propId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [
      { name: "screenPageViews" },   // 0 — page_view
      { name: "sessions" },           // 1
      { name: "activeUsers" },        // 2
      { name: "newUsers" },           // 3
      { name: "engagementRate" },     // 4
      { name: "eventCount" },         // 5 — all events (used as fallback)
      { name: "purchaseRevenue" },    // 6
      { name: "transactions" },       // 7
    ],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  // Request 2: event counts by date for specific events
  const [eventRes] = await client.runReport({
    property: `properties/${propId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }, { name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: {
          values: ["generate_lead", "add_to_cart", "begin_checkout", "purchase"],
        },
      },
    },
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  // Index event counts by date+eventName
  const eventMap = new Map<string, Map<string, number>>();
  for (const row of eventRes.rows ?? []) {
    const date = row.dimensionValues?.[0]?.value ?? "";
    const event = row.dimensionValues?.[1]?.value ?? "";
    const count = Number(row.metricValues?.[0]?.value ?? 0);
    if (!eventMap.has(date)) eventMap.set(date, new Map());
    eventMap.get(date)!.set(event, count);
  }

  // Merge
  return (standardRes.rows ?? []).map((row) => {
    const rawDate = row.dimensionValues?.[0]?.value ?? "";
    const events = eventMap.get(rawDate) ?? new Map<string, number>();
    return {
      date: parseGA4Date(rawDate),
      pageViews: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[2]?.value ?? 0),
      newUsers: Number(row.metricValues?.[3]?.value ?? 0),
      engagementRate: Number(row.metricValues?.[4]?.value ?? 0),
      generateLead: events.get("generate_lead") ?? 0,
      addToCart: events.get("add_to_cart") ?? 0,
      beginCheckout: events.get("begin_checkout") ?? 0,
      purchase: Number(row.metricValues?.[7]?.value ?? 0) || (events.get("purchase") ?? 0),
      purchaseRevenue: Number(row.metricValues?.[6]?.value ?? 0),
    } satisfies GA4DayRow;
  });
}

// ─── Top Pages ────────────────────────────────────────────────────────────────

export async function fetchGA4TopPages(
  startDate: string,
  endDate: string,
  limit = 50,
  propertyId?: string
): Promise<GA4PageRow[]> {
  const propId = propertyId ?? process.env.GA4_PROPERTY_ID;
  if (!propId) throw new Error("GA4_PROPERTY_ID não configurado.");

  const client = getClient();
  const [res] = await client.runReport({
    property: `properties/${propId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "sessions" },
      { name: "engagementRate" },
    ],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit,
  });

  return (res.rows ?? []).map((row) => ({
    pagePath: row.dimensionValues?.[0]?.value ?? "",
    pageTitle: row.dimensionValues?.[1]?.value ?? "",
    screenPageViews: Number(row.metricValues?.[0]?.value ?? 0),
    sessions: Number(row.metricValues?.[1]?.value ?? 0),
    engagementRate: Number(row.metricValues?.[2]?.value ?? 0),
  }));
}

// ─── Sessions by Channel Group ───────────────────────────────────────────────

export interface GA4ChannelRow {
  channelGroup: string;
  sessions: number;
}

export async function fetchGA4SessionsByChannel(
  startDate: string,
  endDate: string,
  propertyId?: string
): Promise<GA4ChannelRow[]> {
  const propId = propertyId ?? process.env.GA4_PROPERTY_ID;
  if (!propId) throw new Error("GA4_PROPERTY_ID não configurado.");

  const client = getClient();
  const [res] = await client.runReport({
    property: `properties/${propId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  return (res.rows ?? []).map((row) => ({
    channelGroup: row.dimensionValues?.[0]?.value ?? "Outros",
    sessions: Number(row.metricValues?.[0]?.value ?? 0),
  }));
}

// ─── Device Breakdown ────────────────────────────────────────────────────────

export interface GA4DeviceCategoryRow {
  deviceCategory: string;
  sessions: number;
}

export async function fetchGA4DeviceBreakdown(
  startDate: string,
  endDate: string,
  propertyId?: string
): Promise<GA4DeviceCategoryRow[]> {
  const propId = propertyId ?? process.env.GA4_PROPERTY_ID;
  if (!propId) throw new Error("GA4_PROPERTY_ID não configurado.");

  const client = getClient();
  const [res] = await client.runReport({
    property: `properties/${propId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "deviceCategory" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  return (res.rows ?? []).map((row) => ({
    deviceCategory: row.dimensionValues?.[0]?.value ?? "Outros",
    sessions: Number(row.metricValues?.[0]?.value ?? 0),
  }));
}

// ─── Users Summary ────────────────────────────────────────────────────────────

export async function fetchGA4UsersSummary(
  startDate: string,
  endDate: string,
  propertyId?: string
): Promise<{ date: string; activeUsers: number; newUsers: number }[]> {
  const propId = propertyId ?? process.env.GA4_PROPERTY_ID;
  if (!propId) throw new Error("GA4_PROPERTY_ID não configurado.");

  const client = getClient();
  const [res] = await client.runReport({
    property: `properties/${propId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "activeUsers" }, { name: "newUsers" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  return (res.rows ?? []).map((row) => ({
    date: parseGA4Date(row.dimensionValues?.[0]?.value ?? ""),
    activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
    newUsers: Number(row.metricValues?.[1]?.value ?? 0),
  }));
}
