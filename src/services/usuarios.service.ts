import { format } from "date-fns";
import type { DateRange } from "@/types";

export interface UsersDayData {
  date: string;
  activeUsers: number;
  newUsers: number;
}

export interface UsersKPIs {
  totalActiveUsers: number;
  totalNewUsers: number;
  avgDailyUsers: number;
  returningRate: number;
}

function fmt(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export async function fetchUsersData(
  userId: string,
  dateRange: DateRange
): Promise<{ days: UsersDayData[]; kpis: UsersKPIs }> {
  const base = typeof window !== "undefined" ? "" : "http://localhost:3000";
  const res = await fetch(
    `${base}/api/ga4?startDate=${fmt(dateRange.startDate)}&endDate=${fmt(dateRange.endDate)}&userId=${userId}&report=users`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Erro ao buscar dados de usuários: ${res.status}`);
  }

  const json = await res.json();
  const days: UsersDayData[] = (json.data ?? []).map((d: any) => ({
    date: format(new Date(d.date + "T00:00:00"), "dd/MM"),
    activeUsers: d.activeUsers,
    newUsers: d.newUsers,
  }));

  const totalActiveUsers = days.reduce((s, d) => s + d.activeUsers, 0);
  const totalNewUsers = days.reduce((s, d) => s + d.newUsers, 0);
  const returningUsers = totalActiveUsers - totalNewUsers;
  const returningRate = totalActiveUsers > 0 ? (returningUsers / totalActiveUsers) * 100 : 0;

  return {
    days,
    kpis: {
      totalActiveUsers,
      totalNewUsers,
      avgDailyUsers: days.length > 0 ? totalActiveUsers / days.length : 0,
      returningRate,
    },
  };
}
