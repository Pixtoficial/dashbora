"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, Database, Zap, Pencil, Save, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDateRange } from "@/contexts/DateContext";
import { getUserIntegrations } from "@/services/integrations.service";
import { fetchFunnelData, type FunnelData } from "@/services/funnel.service";
import { getManualSection, setManualSection } from "@/services/manual-data.service";
import { FunnelTable } from "@/components/funnel/FunnelTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LEADS_FUNNEL_METRICS,
  ECOMMERCE_FUNNEL_METRICS,
  calculateFunnelTotals,
  recalculateDayFromRaw,
  type FunnelDayData,
  type FunnelTotals,
} from "@/lib/calculateFunnelMetrics";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type FunnelType = "leads" | "ecommerce";

type ManualFunnelData = { days: FunnelDayData[]; totals: FunnelTotals };

export default function FunnelPage() {
  const { user } = useAuth();
  const { dateRange, setPreset } = useDateRange();
  const [funnelType, setFunnelType] = useState<FunnelType>("leads");
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [editDays, setEditDays] = useState<FunnelDayData[]>([]);

  const isAdmin = user?.role === "admin";

  const manualKey = `funil.data.${format(dateRange.startDate, "yyyy-MM-dd")}-${format(dateRange.endDate, "yyyy-MM-dd")}`;

  const load = useCallback(async () => {
    if (!user) return;
    const uid = user.role === "viewer" ? "user-1" : user.id;
    const integrations = getUserIntegrations(uid);
    if (!integrations.google.connected && !integrations.ga4.connected) {
      setConnected(false);
      setLoading(false);
      return;
    }
    setConnected(true);
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFunnelData(uid, dateRange);
      const key = `funil.data.${format(dateRange.startDate, "yyyy-MM-dd")}-${format(dateRange.endDate, "yyyy-MM-dd")}`;
      const manual = getManualSection<ManualFunnelData>(key);
      if (manual) {
        setData({ ...result, days: manual.days, totals: manual.totals });
        setEditDays(manual.days);
      } else {
        setData(result);
        setEditDays(result.days);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar dados do funil.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => { load(); }, [load]);

  function handleDayChange(dayIndex: number, field: keyof FunnelDayData, value: number) {
    setEditDays((prev) => {
      const updated = [...prev];
      const day = { ...updated[dayIndex], [field]: value };
      updated[dayIndex] = recalculateDayFromRaw(day);
      return updated;
    });
  }

  function handleSaveFunnel() {
    const totals = calculateFunnelTotals(editDays);
    setData((prev) => prev ? { ...prev, days: editDays, totals } : null);
    setManualSection(manualKey, { days: editDays, totals });
    setEditMode(false);
  }

  function handleCancelEdit() {
    if (data) setEditDays(data.days);
    setEditMode(false);
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
          <WifiOff className="w-7 h-7 text-violet-400" />
        </div>
        <h2 className="text-xl font-semibold">Funil requer Google Ads + GA4</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Conecte Google Ads e Google Analytics 4 para ver o funil de conversão dia a dia com cálculos de CPL, ROAS, Connect Rate e muito mais.
        </p>
        <Button asChild><Link href="/settings">Ir para Integrações</Link></Button>
      </div>
    );
  }

  const activeMetrics = funnelType === "leads" ? LEADS_FUNNEL_METRICS : ECOMMERCE_FUNNEL_METRICS;
  const displayDays = editMode ? editDays : (data?.days ?? []);
  const displayTotals = editMode ? calculateFunnelTotals(editDays) : data?.totals;

  return (
    <div className="space-y-5 max-w-[1600px]">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Funil de Conversão — Visão Diária</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dados combinados de Google Ads + GA4 · Calculados automaticamente ao mudar o período
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-card gap-0.5">
            {(["7d", "14d", "30d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                  dateRange.preset === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {p === "7d" ? "7 dias" : p === "14d" ? "14 dias" : "30 dias"}
              </button>
            ))}
          </div>

          {/* Data source badges */}
          {data && !editMode && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/20 font-semibold">
                <Database className="w-3 h-3" />
                {data.source.gads === "mock" ? "Mock" : "Google Ads"}
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#E37400]/10 text-[#E37400] border border-[#E37400]/20 font-semibold">
                <Database className="w-3 h-3" />
                {data.source.ga4 === "mock" ? "Mock" : "GA4"}
              </span>
            </div>
          )}

          {/* Admin edit controls */}
          {isAdmin && !loading && data && (
            editMode ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={handleSaveFunnel}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="w-3.5 h-3.5" /> Salvar Alterações
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Cancelar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
                className="gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar Dados
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading || editMode}
            className="gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Funnel type toggle */}
      <div className="inline-flex rounded-xl border border-border p-1 bg-card gap-1">
        {(["leads", "ecommerce"] as FunnelType[]).map((type) => (
          <button
            key={type}
            onClick={() => setFunnelType(type)}
            className={cn(
              "relative px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              funnelType === type
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {type === "leads" ? (
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Funil de Leads
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                🛒 Funil E-commerce
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={funnelType}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {funnelType === "leads" ? "Funil de Leads" : "Funil E-commerce"} — {dateRange.label}
              </CardTitle>
              <CardDescription className="text-xs">
                {activeMetrics.length} métricas · linhas = métricas, colunas = dias · scroll horizontal para o período completo
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-5 px-4">
              {loading ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <p className="text-destructive text-sm font-medium">{error}</p>
                  <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
                </div>
              ) : data && displayTotals ? (
                <FunnelTable
                  metrics={activeMetrics}
                  days={displayDays}
                  totals={displayTotals}
                  editMode={editMode}
                  onDayChange={handleDayChange}
                />
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
