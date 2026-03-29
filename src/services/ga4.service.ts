import { format } from "date-fns";
import { getPreviousPeriod } from "@/lib/utils";
import {
  GA4KPIs,
  SessionsBySource,
  GA4DeviceBreakdown,
  GA4RegionBreakdown,
  GA4SessionDuration,
  DateRange,
} from "@/types";
import {
  getFunnelManualData,
  funnelToGA4KPIs,
  funnelToSessionsBySource,
  funnelToGA4Devices,
} from "@/services/funnel-as-source.service";

const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");

const CHANNEL_COLORS: Record<string, string> = {
  "Paid Search":    "#4285F4",
  "Paid Social":    "#1877F2",
  "Organic Search": "#34A853",
  "Direct":         "#8B5CF6",
  "Email":          "#F59E0B",
  "Organic Social": "#E1306C",
  "Referral":       "#06B6D4",
  "Display":        "#FF6D00",
};

function channelColor(group: string): string {
  return CHANNEL_COLORS[group] ?? "#6B7280";
}

function sum(rows: any[], field: string): number {
  return rows.reduce((acc, r) => acc + (r[field] ?? 0), 0);
}

function avg(rows: any[], field: string): number {
  return rows.length ? sum(rows, field) / rows.length : 0;
}

async function fetchGA4Report(report: string, startDate: string, endDate: string): Promise<any[]> {
  const res = await fetch(
    `/api/ga4?report=${report}&startDate=${startDate}&endDate=${endDate}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`GA4 API error: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

export async function fetchGA4KPIs(
  _userId: string,
  dateRange: DateRange
): Promise<GA4KPIs> {
  const funnel = getFunnelManualData();
  if (funnel) return funnelToGA4KPIs(funnel);
  const startDate = fmtDate(dateRange.startDate);
  const endDate = fmtDate(dateRange.endDate);
  const prev = getPreviousPeriod(dateRange.startDate, dateRange.endDate);
  const prevStart = fmtDate(prev.start);
  const prevEnd = fmtDate(prev.end);

  const [rows, prevRows] = await Promise.all([
    fetchGA4Report("daily", startDate, endDate),
    fetchGA4Report("daily", prevStart, prevEnd),
  ]);

  if (!rows.length) throw new Error("not_connected");

  return {
    users: {
      value: sum(rows, "activeUsers"),
      previousValue: sum(prevRows, "activeUsers"),
      format: "number",
    },
    sessions: {
      value: sum(rows, "sessions"),
      previousValue: sum(prevRows, "sessions"),
      format: "number",
    },
    engagementRate: {
      value: avg(rows, "engagementRate") * 100,
      previousValue: avg(prevRows, "engagementRate") * 100,
      format: "percent",
    },
    conversionEvents: {
      value: sum(rows, "purchase") + sum(rows, "generateLead"),
      previousValue: sum(prevRows, "purchase") + sum(prevRows, "generateLead"),
      format: "number",
    },
    revenue: {
      value: sum(rows, "purchaseRevenue"),
      previousValue: sum(prevRows, "purchaseRevenue"),
      format: "currency",
    },
  };
}

export async function fetchSessionsBySource(
  _userId: string,
  dateRange: DateRange
): Promise<SessionsBySource[]> {
  const funnel = getFunnelManualData();
  if (funnel) return funnelToSessionsBySource(funnel);
  const rows = await fetchGA4Report(
    "source",
    fmtDate(dateRange.startDate),
    fmtDate(dateRange.endDate)
  );
  return rows.map((r: any) => ({
    source: r.channelGroup ?? "Outros",
    sessions: r.sessions ?? 0,
    color: channelColor(r.channelGroup ?? ""),
  }));
}

export async function fetchGA4Devices(
  _userId: string,
  dateRange: DateRange
): Promise<GA4DeviceBreakdown[]> {
  const funnel = getFunnelManualData();
  if (funnel) return funnelToGA4Devices(funnel);
  const DEVICE_COLORS: Record<string, string> = {
    mobile:  "#4285F4",
    desktop: "#34A853",
    tablet:  "#FBBC05",
  };

  const rows = await fetchGA4Report(
    "devices",
    fmtDate(dateRange.startDate),
    fmtDate(dateRange.endDate)
  );
  return rows.map((r: any) => {
    const cat = (r.deviceCategory ?? "").toLowerCase();
    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
    return {
      device: label,
      sessions: r.sessions ?? 0,
      color: DEVICE_COLORS[cat] ?? "#6B7280",
    };
  });
}

export async function fetchGA4Regions(
  _userId: string,
  _dateRange: DateRange
): Promise<GA4RegionBreakdown[]> {
  const manual = (await import("@/services/manual-data.service")).getManualSection<GA4RegionBreakdown[]>("ga4.regions");
  if (manual) return manual;
  return [
    { region: "São Paulo",          sessions: 12400, percent: 38.5 },
    { region: "Rio de Janeiro",     sessions:  6800, percent: 21.1 },
    { region: "Minas Gerais",       sessions:  4200, percent: 13.0 },
    { region: "Bahia",              sessions:  2100, percent:  6.5 },
    { region: "Paraná",             sessions:  1800, percent:  5.6 },
    { region: "Rio Grande do Sul",  sessions:  1500, percent:  4.7 },
    { region: "Outros",             sessions:  3400, percent: 10.6 },
  ];
}

export async function fetchGA4SessionDuration(
  _userId: string,
  _dateRange: DateRange
): Promise<GA4SessionDuration[]> {
  const manual = (await import("@/services/manual-data.service")).getManualSection<GA4SessionDuration[]>("ga4.sessionDuration");
  if (manual) return manual;
  return [
    { bucket: "0–10s",    users: 3200 },
    { bucket: "10–30s",   users: 5400 },
    { bucket: "30–60s",   users: 4100 },
    { bucket: "1–3min",   users: 6800 },
    { bucket: "3–10min",  users: 5200 },
    { bucket: "10min+",   users: 2300 },
  ];
}
