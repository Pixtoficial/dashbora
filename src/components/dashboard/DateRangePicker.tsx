"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { useDateRange, PRESET_LABELS } from "@/contexts/DateContext";
import type { DateRange } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const PRESETS: Array<{ value: DateRange["preset"]; label: string }> = [
  { value: "7d",  label: "Últimos 7 dias"  },
  { value: "14d", label: "Últimos 14 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
];

function fmt(d: Date) {
  return format(d, "dd MMM yyyy", { locale: ptBR });
}

export function DateRangePicker() {
  const { dateRange, setPreset, setDateRange } = useDateRange();
  const [open, setOpen] = useState(false);

  // Temporary selection state while the popover is open
  const [pending, setPending] = useState<DayPickerRange>({
    from: dateRange.startDate,
    to:   dateRange.endDate,
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      // Reset pending to current applied range when opening
      setPending({ from: dateRange.startDate, to: dateRange.endDate });
    }
    setOpen(next);
  }

  function handlePreset(value: DateRange["preset"]) {
    if (value === "custom") return;
    setPreset(value);
    setOpen(false);
  }

  function handleCalendarSelect(range: DayPickerRange | undefined) {
    setPending(range ?? { from: undefined, to: undefined });
  }

  function handleApply() {
    if (!pending?.from) return;
    setDateRange({
      startDate: startOfDay(pending.from),
      endDate:   endOfDay(pending.to ?? pending.from),
      preset:    "custom",
      label:     PRESET_LABELS["custom"],
    });
    setOpen(false);
  }

  const canApply = !!pending?.from;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 text-sm font-medium">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <span className="hidden sm:inline">
            {fmt(dateRange.startDate)} — {fmt(dateRange.endDate)}
          </span>
          <span className="sm:hidden">{dateRange.label}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-auto p-0 flex flex-col sm:flex-row shadow-xl"
        sideOffset={8}
      >
        {/* ── Left panel: presets ── */}
        <div className="flex flex-col p-3 gap-0.5 border-b sm:border-b-0 sm:border-r border-border min-w-[160px]">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Período rápido
          </p>
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePreset(p.value)}
              className={cn(
                "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
                dateRange.preset === p.value
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-accent text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}

          <div className="border-t border-border mt-2 pt-2">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Aplicado
            </p>
            <p className="px-2 text-xs text-muted-foreground leading-5">
              {fmt(dateRange.startDate)}
              <br />→ {fmt(dateRange.endDate)}
            </p>
          </div>
        </div>

        {/* ── Right panel: calendar ── */}
        <div className="flex flex-col">
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Intervalo personalizado
            </p>

            {/* Date inputs display */}
            <div className="flex items-center gap-2 mt-2">
              <div className={cn(
                "flex-1 rounded-md border border-border px-3 py-1.5 text-sm text-center",
                pending?.from ? "text-foreground" : "text-muted-foreground"
              )}>
                {pending?.from ? format(pending.from, "dd/MM/yyyy") : "Início"}
              </div>
              <span className="text-muted-foreground text-xs">→</span>
              <div className={cn(
                "flex-1 rounded-md border border-border px-3 py-1.5 text-sm text-center",
                pending?.to ? "text-foreground" : "text-muted-foreground"
              )}>
                {pending?.to ? format(pending.to, "dd/MM/yyyy") : "Fim"}
              </div>
            </div>
          </div>

          {/* Dual-month calendar */}
          <Calendar
            mode="range"
            selected={pending}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
            defaultMonth={
              pending?.from
                ? new Date(pending.from.getFullYear(), pending.from.getMonth() - 1)
                : new Date(new Date().getFullYear(), new Date().getMonth() - 1)
            }
          />

          {/* Apply button */}
          <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {pending?.from && pending?.to
                ? `${Math.round((pending.to.getTime() - pending.from.getTime()) / 86_400_000) + 1} dias`
                : pending?.from
                ? "Selecione a data final"
                : "Selecione a data inicial"}
            </span>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!canApply}
              className="h-8 px-4 text-sm"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
