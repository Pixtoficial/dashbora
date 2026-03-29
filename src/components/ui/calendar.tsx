"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={ptBR}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center items-center relative h-7",
        caption_label: "text-sm font-semibold capitalize",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1",
        button_previous: cn(
          "h-7 w-7 flex items-center justify-center rounded-md border border-border",
          "hover:bg-accent text-muted-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        ),
        button_next: cn(
          "h-7 w-7 flex items-center justify-center rounded-md border border-border",
          "hover:bg-accent text-muted-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 h-9 flex items-center justify-center text-[0.7rem] font-medium text-muted-foreground",
        week: "flex w-full mt-1",
        day: "relative p-0 flex-1 text-center [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected].range_end)]:rounded-r-md [&:has([aria-selected].range_start)]:rounded-l-md [&:has([aria-selected].range_middle)]:rounded-none",
        day_button: cn(
          "h-9 w-9 p-0 mx-auto font-normal text-sm rounded-md transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "aria-selected:opacity-100 disabled:pointer-events-none disabled:opacity-30"
        ),
        range_start: "range_start day-range-start [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground rounded-l-md rounded-r-none",
        range_end: "range_end day-range-end [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground rounded-r-md rounded-l-none",
        range_middle: "range_middle [&>button]:rounded-none [&>button]:bg-accent [&>button]:text-accent-foreground aria-selected:[&>button]:bg-accent aria-selected:[&>button]:text-accent-foreground",
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:font-bold [&>button]:text-primary",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-40",
        disabled: "[&>button]:opacity-30 [&>button]:cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
