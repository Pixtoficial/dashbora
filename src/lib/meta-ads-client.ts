/**
 * Meta (Facebook) Marketing API Client
 * Docs: https://developers.facebook.com/docs/marketing-api/insights
 *
 * Auth: Long-lived System User access token
 * Set env vars: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID
 *   Optional: META_GRAPH_API_VERSION (default "v22.0")
 */

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION ?? "v22.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN não configurado.");
  return token;
}

function getAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID;
  if (!id) throw new Error("META_AD_ACCOUNT_ID não configurado.");
  return id.startsWith("act_") ? id : `act_${id}`;
}

function parseAction(actions: any[] | undefined, type: string): number {
  if (!Array.isArray(actions)) return 0;
  const found = actions.find((a: any) => a.action_type === type);
  return parseFloat(found?.value ?? "0");
}

function parsePurchases(actions: any[] | undefined): number {
  return (
    parseAction(actions, "purchase") ||
    parseAction(actions, "omni_purchase") ||
    parseAction(actions, "offsite_conversion.fb_pixel_purchase")
  );
}

function parsePurchaseValue(actionValues: any[] | undefined): number {
  return (
    parseAction(actionValues, "purchase") ||
    parseAction(actionValues, "omni_purchase") ||
    parseAction(actionValues, "offsite_conversion.fb_pixel_purchase")
  );
}

function parseLeads(actions: any[] | undefined): number {
  return (
    parseAction(actions, "lead") ||
    parseAction(actions, "onsite_web_lead") ||
    parseAction(actions, "offsite_conversion.fb_pixel_lead")
  );
}

async function graphGet(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta Graph API ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Result types ─────────────────────────────────────────────────────────────

export interface MetaInsightsRow {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;       // already in % (e.g., 2.35)
  cpm: number;       // in BRL
  cpc: number;       // in BRL
  reach: number;
  purchases: number;
  purchaseValue: number;
  leads: number;
}

export interface MetaCampaignInsightRow {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;   // % (e.g., 2.35)
  cpc: number;   // BRL
  purchases: number;
  purchaseValue: number;
}

export interface MetaDailyInsightRow {
  date: string;    // YYYY-MM-DD
  spend: number;
  revenue: number; // purchase value in BRL
}

// ─── API functions ────────────────────────────────────────────────────────────

/** Account-level insights for a date range */
export async function fetchMetaInsights(
  startDate: string,
  endDate: string,
  adAccountId?: string
): Promise<MetaInsightsRow> {
  const accountId = adAccountId ?? getAccountId();
  const token = getToken();

  const params = new URLSearchParams({
    fields: "spend,impressions,clicks,ctr,cpm,cpc,reach,actions,action_values",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    access_token: token,
  });

  const json = await graphGet(`${BASE_URL}/${accountId}/insights?${params}`);
  const d = json.data?.[0] ?? {};

  return {
    spend: parseFloat(d.spend ?? "0"),
    impressions: parseInt(d.impressions ?? "0"),
    clicks: parseInt(d.clicks ?? "0"),
    ctr: parseFloat(d.ctr ?? "0"),
    cpm: parseFloat(d.cpm ?? "0"),
    cpc: parseFloat(d.cpc ?? "0"),
    reach: parseInt(d.reach ?? "0"),
    purchases: parsePurchases(d.actions),
    purchaseValue: parsePurchaseValue(d.action_values),
    leads: parseLeads(d.actions),
  };
}

/** Campaign-level insights (aggregated for the date range) */
export async function fetchMetaCampaignInsights(
  startDate: string,
  endDate: string,
  adAccountId?: string
): Promise<MetaCampaignInsightRow[]> {
  const accountId = adAccountId ?? getAccountId();
  const token = getToken();

  const params = new URLSearchParams({
    level: "campaign",
    fields: "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    sort: "spend_descending",
    limit: "50",
    access_token: token,
  });

  const json = await graphGet(`${BASE_URL}/${accountId}/insights?${params}`);
  return (json.data ?? []).map((d: any) => ({
    id: d.campaign_id ?? "",
    name: d.campaign_name ?? "Campanha sem nome",
    spend: parseFloat(d.spend ?? "0"),
    impressions: parseInt(d.impressions ?? "0"),
    clicks: parseInt(d.clicks ?? "0"),
    ctr: parseFloat(d.ctr ?? "0"),
    cpc: parseFloat(d.cpc ?? "0"),
    purchases: parsePurchases(d.actions),
    purchaseValue: parsePurchaseValue(d.action_values),
  }));
}

/** Daily insights for time series chart */
export async function fetchMetaDailyInsights(
  startDate: string,
  endDate: string,
  adAccountId?: string
): Promise<MetaDailyInsightRow[]> {
  const accountId = adAccountId ?? getAccountId();
  const token = getToken();

  const params = new URLSearchParams({
    fields: "spend,action_values",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    time_increment: "1",
    access_token: token,
  });

  const json = await graphGet(`${BASE_URL}/${accountId}/insights?${params}`);
  return (json.data ?? []).map((d: any) => ({
    date: d.date_start ?? "",
    spend: parseFloat(d.spend ?? "0"),
    revenue: parsePurchaseValue(d.action_values),
  }));
}
