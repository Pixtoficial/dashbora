"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Pencil, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPIData } from "@/types";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatMultiplier,
  formatChange,
} from "@/lib/utils";

interface KPICardProps {
  title: string;
  data: KPIData;
  icon?: React.ReactNode;
  isLoading?: boolean;
  delay?: number;
  /** Lower is better (e.g. CPA, CPM) */
  invertTrend?: boolean;
  /** Admin edit mode */
  isEditable?: boolean;
  onSave?: (value: number, previousValue: number) => void;
}

function formatValue(value: number, format: KPIData["format"]): string {
  switch (format) {
    case "currency":    return formatCurrency(value);
    case "percent":     return formatPercent(value);
    case "multiplier":  return formatMultiplier(value);
    default:            return formatNumber(value);
  }
}

function formatHint(format: KPIData["format"]): string {
  switch (format) {
    case "currency":   return "Número (ex: 5000)";
    case "percent":    return "Percentual (ex: 3.2)";
    case "multiplier": return "Multiplicador (ex: 3.8)";
    default:           return "Número inteiro";
  }
}

export function KPICard({
  title,
  data,
  icon,
  isLoading = false,
  delay = 0,
  invertTrend = false,
  isEditable = false,
  onSave,
}: KPICardProps) {
  const [editing, setEditing] = useState(false);
  const [valInput, setValInput] = useState("");
  const [prevInput, setPrevInput] = useState("");
  const valRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setValInput(String(data.value));
      setPrevInput(String(data.previousValue));
      setTimeout(() => valRef.current?.focus(), 50);
    }
  }, [editing, data.value, data.previousValue]);

  function handleSave() {
    const v = parseFloat(valInput.replace(",", "."));
    const p = parseFloat(prevInput.replace(",", "."));
    if (isNaN(v) || isNaN(p)) return;
    onSave?.(v, p);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  const change = formatChange(data.value, data.previousValue);
  const isPositive = invertTrend ? change < 0 : change > 0;
  const isNeutral = Math.abs(change) < 0.01;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
    >
      <Card className="hover:border-border/80 transition-colors relative group">
        <CardContent className="pt-5">
          {/* Edit button — admin only */}
          {isEditable && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
              title="Editar valor"
            >
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </button>
          )}

          {!editing ? (
            <>
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pr-6">
                  {title}
                </p>
                {icon && (
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {icon}
                  </div>
                )}
              </div>

              <p className="text-2xl font-bold mt-2 tracking-tight">
                {formatValue(data.value, data.format)}
              </p>

              <div className="flex items-center gap-1.5 mt-1.5">
                {isNeutral ? (
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Minus className="w-3 h-3" />
                    <span>Sem variação</span>
                  </div>
                ) : (
                  <>
                    <div
                      className={`flex items-center gap-0.5 text-xs font-medium rounded-md px-1.5 py-0.5 ${
                        isPositive
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(change).toFixed(1)}%
                    </div>
                    <span className="text-xs text-muted-foreground">vs. período anterior</span>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Edit form */
            <div className="space-y-2.5" onKeyDown={handleKeyDown}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
              <p className="text-[10px] text-muted-foreground">{formatHint(data.format)}</p>

              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Período atual</label>
                  <input
                    ref={valRef}
                    type="number"
                    value={valInput}
                    onChange={(e) => setValInput(e.target.value)}
                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    step="any"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Período anterior</label>
                  <input
                    type="number"
                    value={prevInput}
                    onChange={(e) => setPrevInput(e.target.value)}
                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    step="any"
                  />
                </div>
              </div>

              <div className="flex gap-1.5 pt-0.5">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Check className="w-3 h-3" /> Salvar
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-md border border-border hover:bg-accent transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function KPICardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5">
        <Skeleton className="h-3 w-20 mb-3" />
        <Skeleton className="h-7 w-28 mb-2.5" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}
