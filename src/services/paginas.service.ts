import { format } from "date-fns";
import type { DateRange } from "@/types";

export interface PageData {
  pagePath: string;
  pageTitle: string;
  screenPageViews: number;
  sessions: number;
  engagementRate: number;
}

function fmt(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export async function fetchTopPages(
  userId: string,
  dateRange: DateRange
): Promise<PageData[]> {
  const base = typeof window !== "undefined" ? "" : "http://localhost:3000";
  const res = await fetch(
    `${base}/api/ga4?startDate=${fmt(dateRange.startDate)}&endDate=${fmt(dateRange.endDate)}&userId=${userId}&report=pages`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Erro ao buscar páginas: ${res.status}`);
  }

  const json = await res.json();
  return json.data ?? [];
}
