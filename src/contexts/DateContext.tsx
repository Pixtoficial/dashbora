"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "@/types";

interface DateContextValue {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  setPreset: (preset: DateRange["preset"]) => void;
}

const DateContext = createContext<DateContextValue | null>(null);

const PRESET_LABELS: Record<DateRange["preset"], string> = {
  "7d": "Últimos 7 dias",
  "14d": "Últimos 14 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  custom: "Período personalizado",
};

function buildPreset(preset: Exclude<DateRange["preset"], "custom">): DateRange {
  const days = parseInt(preset);
  return {
    startDate: startOfDay(subDays(new Date(), days - 1)),
    endDate: endOfDay(new Date()),
    preset,
    label: PRESET_LABELS[preset],
  };
}

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRangeState] = useState<DateRange>(() =>
    buildPreset("30d")
  );

  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range);
  }, []);

  const setPreset = useCallback((preset: DateRange["preset"]) => {
    if (preset === "custom") return;
    setDateRangeState(buildPreset(preset as Exclude<DateRange["preset"], "custom">));
  }, []);

  return (
    <DateContext.Provider value={{ dateRange, setDateRange, setPreset }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error("useDateRange must be used inside DateProvider");
  return ctx;
}

export { PRESET_LABELS };
