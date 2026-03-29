import { format } from "date-fns";
import { getPreviousPeriod } from "@/lib/utils";
import {
  GoogleKPIs,
  GoogleClicksConversionsPoint,
  GoogleCampaignType,
  GoogleCampaign,
  DateRange,
} from "@/types";
import {
  getFunnelManualData,
  funnelToGoogleAdsKPIs,
  funnelToClicksConversions,
  funnelToGoogleCampaignTypes,
} from "@/services/funnel-as-source.service";

const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");

const CHANNEL_TYPE_MAP: Record<string, GoogleCampaign["type"]> = {
  SEARCH:          "Search",
  PERFORMANCE_MAX: "Performance Max",
  DISPLAY:         "Display",
  VIDEO:           "YouTube",
  DEMAND_GEN:      "Demand Gen",
};

async function fetchDailyReport(startDate: string, endDate: string): Promise<any[]> {
  const res = await fetch(
    `/api/google-ads?report=daily&startDate=${startDate}&endDate=${endDate}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Google Ads API error: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

async function fetchCampaignsReport(startDate: string, endDate: string): Promise<any[]> {
  const res = await fetch(
    `/api/google-ads?report=campaigns&startDate=${startDate}&endDate=${endDate}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Google Ads API error: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

function sumField(rows: any[], field: string): number {
  return rows.reduce((acc, r) => acc + (r[field] ?? 0), 0);
}

export async function fetchGoogleAdsKPIs(
  _userId: string,
  dateRange: DateRange
): Promise<GoogleKPIs> {
  const funnel = getFunnelManualData();
  if (funnel) return funnelToGoogleAdsKPIs(funnel);
  const startDate = fmtDate(dateRange.startDate);
  const endDate = fmtDate(dateRange.endDate);
  const prev = getPreviousPeriod(dateRange.startDate, dateRange.endDate);
  const prevStart = fmtDate(prev.start);
  const prevEnd = fmtDate(prev.end);

  const [rows, prevRows] = await Promise.all([
    fetchDailyReport(startDate, endDate),
    fetchDailyReport(prevStart, prevEnd),
  ]);

  if (!rows.length) throw new Error("not_connected");

  const cost        = sumField(rows, "cost");
  const prevCost    = sumField(prevRows, "cost");
  const clicks      = sumField(rows, "clicks");
  const prevClicks  = sumField(prevRows, "clicks");
  const conv        = sumField(rows, "conversions");
  const prevConv    = sumField(prevRows, "conversions");
  const convVal     = sumField(rows, "conversionsValue");
  const prevConvVal = sumField(prevRows, "conversionsValue");
  const impr        = sumField(rows, "impressions");
  const prevImpr    = sumField(prevRows, "impressions");

  return {
    cost: { value: cost, previousValue: prevCost, format: "currency" },
    clicks: { value: clicks, previousValue: prevClicks, format: "number" },
    conversions: { value: conv, previousValue: prevConv, format: "number" },
    costPerConversion: {
      value: conv > 0 ? cost / conv : 0,
      previousValue: prevConv > 0 ? prevCost / prevConv : 0,
      format: "currency",
    },
    ctr: {
      value: impr > 0 ? (clicks / impr) * 100 : 0,
      previousValue: prevImpr > 0 ? (prevClicks / prevImpr) * 100 : 0,
      format: "percent",
    },
    avgCpc: {
      value: clicks > 0 ? cost / clicks : 0,
      previousValue: prevClicks > 0 ? prevCost / prevClicks : 0,
      format: "currency",
    },
    roas: {
      value: cost > 0 ? convVal / cost : 0,
      previousValue: prevCost > 0 ? prevConvVal / prevCost : 0,
      format: "multiplier",
    },
    // Impression share requires a separate competitive metrics query.
    impressionShare: { value: 0, previousValue: 0, format: "percent" },
  };
}

export async function fetchGoogleClicksConversions(
  _userId: string,
  dateRange: DateRange
): Promise<GoogleClicksConversionsPoint[]> {
  const funnel = getFunnelManualData();
  if (funnel) return funnelToClicksConversions(funnel);
  const rows = await fetchDailyReport(
    fmtDate(dateRange.startDate),
    fmtDate(dateRange.endDate)
  );
  return rows.map((r: any) => ({
    // date comes as "YYYY-MM-DD", chart expects "MM/DD"
    date: r.date ? r.date.slice(5).replace("-", "/") : "",
    clicks: r.clicks ?? 0,
    conversions: r.conversions ?? 0,
  }));
}

export async function fetchGoogleCampaignTypes(
  _userId: string,
  dateRange: DateRange
): Promise<GoogleCampaignType[]> {
  const funnel = getFunnelManualData();
  if (funnel) return funnelToGoogleCampaignTypes(funnel);
  const rows = await fetchCampaignsReport(
    fmtDate(dateRange.startDate),
    fmtDate(dateRange.endDate)
  );

  const typeMap = new Map<string, { cost: number; clicks: number; conversions: number; convVal: number }>();
  for (const r of rows) {
    const type = CHANNEL_TYPE_MAP[r.channelType] ?? r.channelType ?? "Outros";
    const existing = typeMap.get(type);
    const cost = (r.costMicros ?? 0) / 1_000_000;
    const convVal = (r.conversionsValue ?? 0) / 1_000_000;
    if (!existing) {
      typeMap.set(type, { cost, clicks: r.clicks ?? 0, conversions: r.conversions ?? 0, convVal });
    } else {
      existing.cost += cost;
      existing.clicks += r.clicks ?? 0;
      existing.conversions += r.conversions ?? 0;
      existing.convVal += convVal;
    }
  }

  return Array.from(typeMap.entries()).map(([type, v]) => ({
    type,
    cost: v.cost,
    clicks: v.clicks,
    conversions: v.conversions,
    roas: v.cost > 0 ? v.convVal / v.cost : 0,
  }));
}

export async function fetchGoogleActiveCampaigns(
  _userId: string,
  dateRange: DateRange
): Promise<GoogleCampaign[]> {
  const rows = await fetchCampaignsReport(
    fmtDate(dateRange.startDate),
    fmtDate(dateRange.endDate)
  );

  return rows.map((r: any) => {
    const cost = (r.costMicros ?? 0) / 1_000_000;
    const convVal = (r.conversionsValue ?? 0) / 1_000_000;
    return {
      id: String(r.campaignId ?? r.id ?? Math.random()),
      name: r.campaignName ?? r.name ?? "Campanha",
      type: (CHANNEL_TYPE_MAP[r.channelType] ?? "Search") as GoogleCampaign["type"],
      status: "active" as const,
      spend: cost,
      clicks: r.clicks ?? 0,
      conversions: r.conversions ?? 0,
      roas: cost > 0 ? convVal / cost : 0,
      keywords: [],
      keywordStats: [],
      assets: [],
      videos: [],
    };
  });
}
