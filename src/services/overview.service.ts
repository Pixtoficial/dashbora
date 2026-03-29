import { OverviewKPIs, OverviewDailyPoint, TimeSeriesPoint, SpendShare, DateRange } from "@/types";
import { getDaysBetween, generateTimeSeries, seededRandom } from "@/lib/utils";
import { eachDayOfInterval, format } from "date-fns";

// Sum of Meta + Google per user (30-day baseline)
const USER_BASE: Record<
  string,
  {
    totalSpend: number;
    leads: number;
    clicks: number;
    impressions: number;
    pageViews: number;
    metaSpend: number;
    googleSpend: number;
    totalRevenue: number; // kept for time-series chart only
  }
> = {
  "user-1": {
    totalSpend:   73_730,
    leads:         2_230,
    clicks:       85_000,
    impressions: 2_800_000,
    pageViews:   320_000,
    metaSpend:    45_230,
    googleSpend:  28_500,
    totalRevenue: 298_266,
  },
  "user-2": {
    totalSpend:  12_000,
    leads:          310,
    clicks:      14_000,
    impressions: 450_000,
    pageViews:    52_000,
    metaSpend:   12_000,
    googleSpend:      0,
    totalRevenue:  33_600,
  },
};

function scale(base: number, days: number, prev = false) {
  const factor = (days / 30) * (prev ? 0.88 + Math.random() * 0.18 : 1);
  return base * factor;
}

export async function fetchOverviewKPIs(
  userId: string,
  dateRange: DateRange
): Promise<OverviewKPIs> {
  await new Promise((r) => setTimeout(r, 700));

  const b = USER_BASE[userId] ?? USER_BASE["user-2"];
  const days = getDaysBetween(dateRange.startDate, dateRange.endDate) + 1;

  const spend       = scale(b.totalSpend,   days);
  const prevSpend   = scale(b.totalSpend,   days, true);
  const leads       = scale(b.leads,        days);
  const prevLeads   = scale(b.leads,        days, true);
  const clicks      = scale(b.clicks,       days);
  const prevClicks  = scale(b.clicks,       days, true);
  const impr        = scale(b.impressions,  days);
  const prevImpr    = scale(b.impressions,  days, true);
  const pviews      = scale(b.pageViews,    days);
  const prevPviews  = scale(b.pageViews,    days, true);

  const ctr     = impr > 0 ? (clicks / impr) * 100 : 0;
  const prevCtr = prevImpr > 0 ? (prevClicks / prevImpr) * 100 : 0;
  const cpm     = impr > 0 ? (spend / impr) * 1_000 : 0;
  const prevCpm = prevImpr > 0 ? (prevSpend / prevImpr) * 1_000 : 0;

  return {
    totalSpend:      { value: spend,           previousValue: prevSpend,   format: "currency" },
    totalLeads:      { value: leads,           previousValue: prevLeads,   format: "number"   },
    cpl:             { value: spend / leads,   previousValue: prevSpend / prevLeads, format: "currency" },
    totalClicks:     { value: clicks,          previousValue: prevClicks,  format: "number"   },
    totalImpressions:{ value: impr,            previousValue: prevImpr,    format: "number"   },
    ctr:             { value: ctr,             previousValue: prevCtr,     format: "percent"  },
    totalPageViews:  { value: pviews,          previousValue: prevPviews,  format: "number"   },
    cpm:             { value: cpm,             previousValue: prevCpm,     format: "currency" },
  };
}

export async function fetchOverviewDailySeries(
  userId: string,
  dateRange: DateRange
): Promise<OverviewDailyPoint[]> {
  await new Promise((r) => setTimeout(r, 500));
  const b = USER_BASE[userId] ?? USER_BASE["user-2"];
  const rand = seededRandom(parseInt(userId.replace(/\D/g, ""), 10) + 77);
  const dates = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
  return dates.map((date) => {
    const impressions = Math.round((b.impressions / 30) * (0.7 + rand() * 0.6));
    const clicks      = Math.round((b.clicks / 30) * (0.7 + rand() * 0.6));
    const investment  = Math.round((b.totalSpend / 30) * (0.75 + rand() * 0.5));
    const leads       = Math.round((b.leads / 30) * (0.65 + rand() * 0.7));
    const sessions    = Math.round((b.clicks / 30) * 0.9 * (0.75 + rand() * 0.5));
    const ctr  = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;
    const cpm  = impressions > 0 ? parseFloat(((investment / impressions) * 1000).toFixed(2)) : 0;
    return { date: format(date, "dd/MM"), impressions, clicks, sessions, investment, ctr, leads, cpm };
  });
}

export async function fetchOverviewTimeSeries(
  userId: string,
  dateRange: DateRange
): Promise<TimeSeriesPoint[]> {
  await new Promise((r) => setTimeout(r, 600));

  const b = USER_BASE[userId] ?? USER_BASE["user-2"];
  const seed = parseInt(userId.replace(/\D/g, ""), 10) + 99;
  return generateTimeSeries(
    dateRange.startDate,
    dateRange.endDate,
    b.totalSpend / 30,
    b.totalRevenue / 30,
    seed
  );
}

export async function fetchSpendShare(
  userId: string,
  dateRange: DateRange
): Promise<SpendShare[]> {
  await new Promise((r) => setTimeout(r, 400));

  const b = USER_BASE[userId] ?? USER_BASE["user-2"];
  const days = getDaysBetween(dateRange.startDate, dateRange.endDate) + 1;
  const factor = days / 30;

  const shares: SpendShare[] = [];
  if (b.metaSpend > 0) {
    shares.push({ platform: "Meta Ads",   value: b.metaSpend   * factor, color: "#1877F2" });
  }
  if (b.googleSpend > 0) {
    shares.push({ platform: "Google Ads", value: b.googleSpend * factor, color: "#4285F4" });
  }
  return shares;
}
