import { format } from "date-fns";
import { getPreviousPeriod } from "@/lib/utils";
import { MetaKPIs, MetaCampaign, TimeSeriesPoint, DateRange } from "@/types";

const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");

async function fetchMetaReport(report: string, startDate: string, endDate: string): Promise<any> {
  const res = await fetch(
    `/api/meta-ads?report=${report}&startDate=${startDate}&endDate=${endDate}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Meta Ads API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function fetchMetaAdsKPIs(
  _userId: string,
  dateRange: DateRange
): Promise<MetaKPIs> {
  const startDate = fmtDate(dateRange.startDate);
  const endDate = fmtDate(dateRange.endDate);
  const prev = getPreviousPeriod(dateRange.startDate, dateRange.endDate);
  const prevStart = fmtDate(prev.start);
  const prevEnd = fmtDate(prev.end);

  const [curr, prevData] = await Promise.all([
    fetchMetaReport("insights", startDate, endDate),
    fetchMetaReport("insights", prevStart, prevEnd),
  ]);

  const spend        = curr.spend ?? 0;
  const prevSpend    = prevData.spend ?? 0;
  const impr         = curr.impressions ?? 0;
  const prevImpr     = prevData.impressions ?? 0;
  const clicks       = curr.clicks ?? 0;
  const prevClicks   = prevData.clicks ?? 0;
  const purchases    = (curr.purchases ?? 0) + (curr.leads ?? 0);
  const prevPurch    = (prevData.purchases ?? 0) + (prevData.leads ?? 0);
  const purchVal     = curr.purchaseValue ?? 0;
  const prevPurchVal = prevData.purchaseValue ?? 0;

  return {
    spend: { value: spend, previousValue: prevSpend, format: "currency" },
    impressions: { value: impr, previousValue: prevImpr, format: "number" },
    cpm: {
      value: curr.cpm ?? (impr > 0 ? (spend / impr) * 1000 : 0),
      previousValue: prevData.cpm ?? (prevImpr > 0 ? (prevSpend / prevImpr) * 1000 : 0),
      format: "currency",
    },
    ctr: {
      value: curr.ctr ?? (impr > 0 ? (clicks / impr) * 100 : 0),
      previousValue: prevData.ctr ?? (prevImpr > 0 ? (prevClicks / prevImpr) * 100 : 0),
      format: "percent",
    },
    cpc: {
      value: curr.cpc ?? (clicks > 0 ? spend / clicks : 0),
      previousValue: prevData.cpc ?? (prevClicks > 0 ? prevSpend / prevClicks : 0),
      format: "currency",
    },
    purchases: { value: purchases, previousValue: prevPurch, format: "number" },
    cpa: {
      value: purchases > 0 ? spend / purchases : 0,
      previousValue: prevPurch > 0 ? prevSpend / prevPurch : 0,
      format: "currency",
    },
    roas: {
      value: spend > 0 ? purchVal / spend : 0,
      previousValue: prevSpend > 0 ? prevPurchVal / prevSpend : 0,
      format: "multiplier",
    },
  };
}

export async function fetchMetaCampaigns(
  _userId: string,
  dateRange: DateRange
): Promise<MetaCampaign[]> {
  const rows: any[] = await fetchMetaReport(
    "campaigns",
    fmtDate(dateRange.startDate),
    fmtDate(dateRange.endDate)
  );

  return rows.map((r: any) => {
    const spend  = r.spend ?? 0;
    const impr   = r.impressions ?? 0;
    const clicks = r.clicks ?? 0;
    const conv   = r.purchases ?? 0;
    const convVal= r.purchaseValue ?? 0;
    return {
      id: r.id ?? String(Math.random()),
      name: r.name ?? "Campanha",
      status: (r.status === "PAUSED" ? "paused" : "active") as "active" | "paused",
      spend,
      impressions: impr,
      clicks,
      ctr: r.ctr ?? (impr > 0 ? (clicks / impr) * 100 : 0),
      cpc: r.cpc ?? (clicks > 0 ? spend / clicks : 0),
      conversions: conv,
      cpa: conv > 0 ? spend / conv : 0,
      roas: spend > 0 ? convVal / spend : 0,
    } satisfies MetaCampaign;
  });
}

export async function fetchMetaTimeSeries(
  _userId: string,
  dateRange: DateRange
): Promise<TimeSeriesPoint[]> {
  const rows: any[] = await fetchMetaReport(
    "daily",
    fmtDate(dateRange.startDate),
    fmtDate(dateRange.endDate)
  );

  return rows.map((r: any) => ({
    date: r.date ? r.date.slice(5).replace("-", "/") : "",
    investment: r.spend ?? 0,
    revenue: r.revenue ?? 0,
  }));
}
