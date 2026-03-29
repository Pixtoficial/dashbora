import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("pt-BR");
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`;
}

export function formatChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function formatDate(date: Date): string {
  return format(date, "dd MMM", { locale: ptBR });
}

export function formatDateFull(date: Date): string {
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

export function generateDateRange(startDate: Date, endDate: Date): string[] {
  return eachDayOfInterval({ start: startDate, end: endDate }).map((d) =>
    format(d, "dd/MM")
  );
}

export function getDaysBetween(startDate: Date, endDate: Date): number {
  return Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function getPreviousPeriod(
  startDate: Date,
  endDate: Date
): { start: Date; end: Date } {
  const days = getDaysBetween(startDate, endDate);
  return {
    start: subDays(startDate, days + 1),
    end: subDays(startDate, 1),
  };
}

// Seeded random for consistent mock data per user
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateTimeSeries(
  startDate: Date,
  endDate: Date,
  baseInvestment: number,
  baseRevenue: number,
  seed: number
) {
  const rand = seededRandom(seed);
  const dates = eachDayOfInterval({ start: startDate, end: endDate });
  return dates.map((date) => ({
    date: format(date, "dd/MM"),
    investment: Math.round(baseInvestment * (0.8 + rand() * 0.4)),
    revenue: Math.round(baseRevenue * (0.75 + rand() * 0.5)),
  }));
}
