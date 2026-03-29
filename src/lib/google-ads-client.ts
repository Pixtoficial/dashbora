/**
 * Google Ads REST API Client
 * Docs: https://developers.google.com/google-ads/api/rest/reference/rest
 *
 * Auth: OAuth2 via google-auth-library (refresh token flow)
 * Set env vars: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
 *               GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_DEVELOPER_TOKEN,
 *               GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_API_VERSION
 */

import { OAuth2Client } from "google-auth-library";

const API_VERSION = process.env.GOOGLE_ADS_API_VERSION ?? "v19";
const BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`;

function createOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET
  );
}

async function getAccessToken(): Promise<string> {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Não foi possível obter access token do Google Ads.");
  return token;
}

function getHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
    "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "",
    "Content-Type": "application/json",
  };
}

// ─── GAQL Queries ────────────────────────────────────────────────────────────

/**
 * Busca métricas diárias de desempenho de campanhas.
 * Retorna: date, cost_micros, impressions, clicks, ctr, average_cpm, average_cpc,
 *          active_view_impressions (proxy para Alcance em Display/Video)
 */
function buildDailyMetricsQuery(startDate: string, endDate: string): string {
  // startDate / endDate formato: YYYY-MM-DD
  return `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      campaign.advertising_channel_type,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpm,
      metrics.average_cpc,
      metrics.active_view_impressions,
      metrics.all_conversions,
      metrics.all_conversions_value,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status = 'ENABLED'
    ORDER BY segments.date ASC
  `;
}

// ─── Raw result types (Google Ads REST) ──────────────────────────────────────

export interface GadsRawRow {
  segmentsDate: string;          // "YYYY-MM-DD"
  campaignName: string;
  channelType?: string;          // advertising_channel_type
  costMicros: number;            // divide por 1_000_000 → R$
  impressions: number;
  clicks: number;
  ctr: number;                   // 0–1 decimal (×100 = %)
  averageCpm: number;            // micros
  averageCpc: number;            // micros
  activeViewImpressions: number; // proxy para Alcance
  allConversions: number;
  allConversionsValue: number;
  conversions: number;
  conversionsValue: number;
}

// ─── Main Fetch Function ──────────────────────────────────────────────────────

export async function fetchGoogleAdsDaily(
  startDate: string,
  endDate: string,
  customerId?: string
): Promise<GadsRawRow[]> {
  const cid = customerId ?? process.env.GOOGLE_ADS_CUSTOMER_ID;
  if (!cid) throw new Error("GOOGLE_ADS_CUSTOMER_ID não configurado.");

  const accessToken = await getAccessToken();
  const query = buildDailyMetricsQuery(startDate, endDate);

  const url = `${BASE_URL}/customers/${cid}/googleAds:search`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(accessToken),
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const results: GadsRawRow[] = (json.results ?? []).map((r: any) => ({
    segmentsDate: r.segments?.date ?? "",
    campaignName: r.campaign?.name ?? "",
    costMicros: Number(r.metrics?.costMicros ?? 0),
    impressions: Number(r.metrics?.impressions ?? 0),
    clicks: Number(r.metrics?.clicks ?? 0),
    ctr: Number(r.metrics?.ctr ?? 0),
    averageCpm: Number(r.metrics?.averageCpm ?? 0),
    averageCpc: Number(r.metrics?.averageCpc ?? 0),
    activeViewImpressions: Number(r.metrics?.activeViewImpressions ?? 0),
    allConversions: Number(r.metrics?.allConversions ?? 0),
    allConversionsValue: Number(r.metrics?.allConversionsValue ?? 0),
    conversions: Number(r.metrics?.conversions ?? 0),
    conversionsValue: Number(r.metrics?.conversionsValue ?? 0),
  }));

  return results;
}

/** Agrega linhas por data (soma todas as campanhas por dia) */
export function aggregateGadsByDate(rows: GadsRawRow[]): Map<string, GadsRawRow> {
  const map = new Map<string, GadsRawRow>();

  for (const row of rows) {
    const existing = map.get(row.segmentsDate);
    if (!existing) {
      map.set(row.segmentsDate, { ...row });
    } else {
      existing.costMicros += row.costMicros;
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.activeViewImpressions += row.activeViewImpressions;
      existing.allConversions += row.allConversions;
      existing.allConversionsValue += row.allConversionsValue;
      existing.conversions += row.conversions;
      existing.conversionsValue += row.conversionsValue;
      // CTR, CPM, CPC recalculados depois de agregar
      existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
      existing.averageCpm = existing.impressions > 0
        ? (existing.costMicros / existing.impressions) * 1000
        : 0;
      existing.averageCpc = existing.clicks > 0
        ? existing.costMicros / existing.clicks
        : 0;
    }
  }

  return map;
}

// ─── Campaign-level aggregated result ────────────────────────────────────────

export interface GadsCampaignRow {
  campaignId: string;
  campaignName: string;
  channelType: string;   // SEARCH, PERFORMANCE_MAX, DISPLAY, VIDEO, DEMAND_GEN
  costMicros: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionsValue: number;
}

function buildCampaignsQuery(startDate: string, endDate: string): string {
  return `
    SELECT
      campaign.id,
      campaign.name,
      campaign.advertising_channel_type,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
  `;
}

export async function fetchGoogleAdsCampaigns(
  startDate: string,
  endDate: string,
  customerId?: string
): Promise<GadsCampaignRow[]> {
  const cid = customerId ?? process.env.GOOGLE_ADS_CUSTOMER_ID;
  if (!cid) throw new Error("GOOGLE_ADS_CUSTOMER_ID não configurado.");

  const accessToken = await getAccessToken();
  const query = buildCampaignsQuery(startDate, endDate);

  const url = `${BASE_URL}/customers/${cid}/googleAds:search`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(accessToken),
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads API error ${res.status}: ${err}`);
  }

  const json = await res.json();

  // Aggregate by campaignId (rows might repeat if the query returns daily splits)
  const map = new Map<string, GadsCampaignRow>();
  for (const r of json.results ?? []) {
    const id = String(r.campaign?.id ?? "");
    const existing = map.get(id);
    if (!existing) {
      map.set(id, {
        campaignId: id,
        campaignName: r.campaign?.name ?? "",
        channelType: r.campaign?.advertisingChannelType ?? "UNKNOWN",
        costMicros: Number(r.metrics?.costMicros ?? 0),
        impressions: Number(r.metrics?.impressions ?? 0),
        clicks: Number(r.metrics?.clicks ?? 0),
        conversions: Number(r.metrics?.conversions ?? 0),
        conversionsValue: Number(r.metrics?.conversionsValue ?? 0),
      });
    } else {
      existing.costMicros += Number(r.metrics?.costMicros ?? 0);
      existing.impressions += Number(r.metrics?.impressions ?? 0);
      existing.clicks += Number(r.metrics?.clicks ?? 0);
      existing.conversions += Number(r.metrics?.conversions ?? 0);
      existing.conversionsValue += Number(r.metrics?.conversionsValue ?? 0);
    }
  }

  return Array.from(map.values());
}
