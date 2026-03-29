"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Pencil, Save, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDateRange } from "@/contexts/DateContext";
import { getUserIntegrations } from "@/services/integrations.service";
import { getManualSection, setManualSection } from "@/services/manual-data.service";
import {
  fetchMetaAdsKPIs,
  fetchMetaCampaigns,
} from "@/services/meta-ads.service";
import { KPICard, KPICardSkeleton } from "@/components/dashboard/KPICard";
import { TopCampaignsChart } from "@/components/charts/TopCampaignsChart";
import { CampaignsTable } from "@/components/tables/CampaignsTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MetaKPIs, MetaCampaign } from "@/types";
import Link from "next/link";

export default function MetaAdsPage() {
  const { user } = useAuth();
  const { dateRange } = useDateRange();
  const [kpis, setKpis] = useState<MetaKPIs | null>(null);
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  const [showCampaignEditor, setShowCampaignEditor] = useState(false);
  const [editCampaigns, setEditCampaigns] = useState<MetaCampaign[]>([]);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    const uid = user.role === "viewer" ? "user-1" : user.id;
    const integrations = getUserIntegrations(uid);
    if (!integrations.meta.connected) { setConnected(false); setLoading(false); return; }
    setConnected(true); setLoading(true);
    const manualKPIs = getManualSection<MetaKPIs>("meta.kpis");
    const manualCampaigns = getManualSection<MetaCampaign[]>("meta.campaigns");
    Promise.all([
      manualKPIs ? Promise.resolve(manualKPIs) : fetchMetaAdsKPIs(uid, dateRange),
      manualCampaigns ? Promise.resolve(manualCampaigns) : fetchMetaCampaigns(uid, dateRange),
    ]).then(([k, c]) => {
      setKpis(k);
      setCampaigns(c);
      setEditCampaigns(c);
      setLoading(false);
    });
  }, [user, dateRange]);

  function saveKPI(field: keyof MetaKPIs) {
    return (value: number, previousValue: number) => {
      if (!kpis) return;
      const updated = { ...kpis, [field]: { ...kpis[field], value, previousValue } };
      setKpis(updated);
      setManualSection("meta.kpis", updated);
    };
  }

  function handleSaveCampaigns() {
    setCampaigns(editCampaigns);
    setManualSection("meta.campaigns", editCampaigns);
    setShowCampaignEditor(false);
  }

  function handleCancelCampaigns() {
    setEditCampaigns([...campaigns]);
    setShowCampaignEditor(false);
  }

  function updateEditCampaign(id: string, field: keyof MetaCampaign, raw: string) {
    const value = parseFloat(raw) || 0;
    setEditCampaigns((prev) =>
      prev.map((c) => c.id === id ? { ...c, [field]: value } : c)
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1877F2]/10 flex items-center justify-center">
          <WifiOff className="w-7 h-7 text-[#1877F2]" />
        </div>
        <h2 className="text-xl font-semibold">Meta Ads não conectado</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Conecte sua conta Meta Ads para visualizar métricas de campanhas, gastos, ROAS e muito mais.
        </p>
        <Button asChild>
          <Link href="/settings">Ir para Integrações</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading || !kpis ? (
          Array.from({ length: 8 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <KPICard title="Valor Gasto"      data={kpis.spend}       delay={0}    invertTrend isEditable={isAdmin} onSave={saveKPI("spend")} />
            <KPICard title="Impressões"        data={kpis.impressions} delay={0.04}             isEditable={isAdmin} onSave={saveKPI("impressions")} />
            <KPICard title="CPM"               data={kpis.cpm}         delay={0.08} invertTrend isEditable={isAdmin} onSave={saveKPI("cpm")} />
            <KPICard title="CTR"               data={kpis.ctr}         delay={0.12}             isEditable={isAdmin} onSave={saveKPI("ctr")} />
            <KPICard title="CPC"               data={kpis.cpc}         delay={0.16} invertTrend isEditable={isAdmin} onSave={saveKPI("cpc")} />
            <KPICard title="Compras / Leads"   data={kpis.purchases}   delay={0.2}              isEditable={isAdmin} onSave={saveKPI("purchases")} />
            <KPICard title="CPA"               data={kpis.cpa}         delay={0.24} invertTrend isEditable={isAdmin} onSave={saveKPI("cpa")} />
            <KPICard title="ROAS"              data={kpis.roas}        delay={0.28}             isEditable={isAdmin} onSave={saveKPI("roas")} />
          </>
        )}
      </div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top 5 Campanhas por Gasto</CardTitle>
            <CardDescription className="text-xs">Comparativo de investimento e ROAS</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || campaigns.length === 0 ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <TopCampaignsChart campaigns={campaigns} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Campaign editor (admin only) */}
      {isAdmin && !loading && campaigns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32 }}
        >
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
              onClick={() => {
                if (!showCampaignEditor) setEditCampaigns([...campaigns]);
                setShowCampaignEditor((v) => !v);
              }}
            >
              <div className="flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">Editar Campanhas</span>
                <span className="text-xs text-muted-foreground">· {campaigns.length} campanhas</span>
              </div>
              <motion.div animate={{ rotate: showCampaignEditor ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {showCampaignEditor && (
                <motion.div
                  key="editor"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-border"
                >
                  <div className="p-4 space-y-3">
                    <p className="text-[11px] text-muted-foreground">
                      Edite os valores numéricos das campanhas. Clique em Salvar para persistir.
                    </p>

                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border">
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground min-w-[180px]">Campanha</th>
                            <th className="text-right px-3 py-2 font-semibold text-muted-foreground w-28">Gasto (R$)</th>
                            <th className="text-right px-3 py-2 font-semibold text-muted-foreground w-28">Impressões</th>
                            <th className="text-right px-3 py-2 font-semibold text-muted-foreground w-28">Cliques</th>
                            <th className="text-right px-3 py-2 font-semibold text-muted-foreground w-28">Conversões</th>
                            <th className="text-right px-3 py-2 font-semibold text-muted-foreground w-24">ROAS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editCampaigns.map((c, i) => (
                            <tr key={c.id} className={cn("border-b border-border/50 last:border-0", i % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                              <td className="px-3 py-2 font-medium truncate max-w-[180px]" title={c.name}>{c.name}</td>
                              {(["spend", "impressions", "clicks", "conversions", "roas"] as (keyof MetaCampaign)[]).map((field) => (
                                <td key={field} className="px-2 py-1.5 text-right">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={c[field] as number}
                                    onChange={(e) => updateEditCampaign(c.id, field, e.target.value)}
                                    className="w-full h-7 px-2 text-right font-mono text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={handleCancelCampaigns} className="gap-1.5">
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSaveCampaigns} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Save className="w-3.5 h-3.5" /> Salvar Campanhas
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Todas as Campanhas</CardTitle>
            <CardDescription className="text-xs">Clique no cabeçalho para ordenar</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-0">
            {loading || campaigns.length === 0 ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <CampaignsTable campaigns={campaigns} />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
