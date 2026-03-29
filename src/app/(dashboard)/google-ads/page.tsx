"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Search, Zap, Video, Monitor, ChevronDown, Pencil, Save, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDateRange } from "@/contexts/DateContext";
import { getUserIntegrations } from "@/services/integrations.service";
import { fetchGoogleAdsKPIs, fetchGoogleClicksConversions, fetchGoogleCampaignTypes, fetchGoogleActiveCampaigns } from "@/services/google-ads.service";
import { KPICard, KPICardSkeleton } from "@/components/dashboard/KPICard";
import { ClicksConversionsChart } from "@/components/charts/ClicksConversionsChart";
import { CampaignTypePieChart } from "@/components/charts/CampaignTypePieChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatNumber, formatMultiplier, formatPercent } from "@/lib/utils";
import { getManualSection, setManualSection } from "@/services/manual-data.service";
import type { GoogleKPIs, GoogleClicksConversionsPoint, GoogleCampaignType, GoogleCampaign } from "@/types";
import Link from "next/link";

const TYPE_COLORS: Record<string, string> = { Search: "#4285F4", "Performance Max": "#34A853", "Demand Gen": "#FF6D00", Display: "#FBBC05", YouTube: "#EA4335" };
const TYPE_ICONS: Record<string, React.ReactNode> = {
  Search: <Search className="w-3.5 h-3.5" />,
  "Performance Max": <Zap className="w-3.5 h-3.5" />,
  "Demand Gen": <Video className="w-3.5 h-3.5" />,
  Display: <Monitor className="w-3.5 h-3.5" />,
  YouTube: <Video className="w-3.5 h-3.5" />,
};

const MATCH_COLORS: Record<string, string> = {
  Exata: "bg-[#4285F4]/10 text-[#4285F4] border-[#4285F4]/30",
  Frase: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  Ampla: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

interface CampaignCardProps {
  c: GoogleCampaign;
  isAdmin?: boolean;
  onSaveCampaign?: (id: string, spend: number, clicks: number, conversions: number, roas: number) => void;
}

function CampaignCard({ c, isAdmin, onSaveCampaign }: CampaignCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [form, setForm] = useState({
    spend: c.spend,
    clicks: c.clicks,
    conversions: c.conversions,
    roas: c.roas,
  });

  const accent = TYPE_COLORS[c.type] ?? "#888";
  const hasKeywordStats = (c.keywordStats?.length ?? 0) > 0;
  const hasAssets = (c.assets?.length ?? 0) > 0;
  const hasVideos = (c.videos?.length ?? 0) > 0;
  const canExpand = hasKeywordStats || hasAssets || hasVideos || isAdmin;

  function handleSaveMetrics() {
    onSaveCampaign?.(c.id, form.spend, form.clicks, form.conversions, form.roas);
    setEditingMetrics(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div
        className={cn("flex items-center justify-between px-4 py-3 border-b border-border/50", canExpand && "cursor-pointer hover:bg-accent/30 transition-colors")}
        style={{ borderLeftWidth: 4, borderLeftColor: accent }}
        onClick={() => canExpand && setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ color: accent, borderColor: `${accent}40`, background: `${accent}15` }}>
              {TYPE_ICONS[c.type]} {c.type}
            </span>
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/15 text-zinc-400")}>
              {c.status === "active" ? "● Ativo" : "● Pausado"}
            </span>
          </div>
          <p className="text-sm font-semibold truncate">{c.name}</p>
        </div>
        {canExpand && (
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
          </motion.div>
        )}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-border/50">
        {[
          { label: "Gasto",      value: formatCurrency(c.spend) },
          { label: "Cliques",    value: formatNumber(c.clicks) },
          { label: "Conversões", value: formatNumber(c.conversions) },
          { label: "ROAS",       value: formatMultiplier(c.roas) },
        ].map(({ label, value }) => (
          <div key={label} className="px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold font-mono mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/50"
          >
            {/* Admin metric editor */}
            {isAdmin && (
              <div className="px-4 py-3 border-b border-border/40">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Editar Métricas</p>
                  {!editingMetrics && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setForm({ spend: c.spend, clicks: c.clicks, conversions: c.conversions, roas: c.roas }); setEditingMetrics(true); }}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border hover:bg-accent transition-colors text-muted-foreground"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                  )}
                </div>

                {editingMetrics ? (
                  <div onClick={(e) => e.stopPropagation()} className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {([
                        { field: "spend",       label: "Gasto (R$)", step: "0.01" },
                        { field: "clicks",      label: "Cliques",    step: "1" },
                        { field: "conversions", label: "Conversões", step: "0.1" },
                        { field: "roas",        label: "ROAS",       step: "0.01" },
                      ] as { field: keyof typeof form; label: string; step: string }[]).map(({ field, label, step }) => (
                        <div key={field}>
                          <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">{label}</label>
                          <input
                            type="number"
                            min={0}
                            step={step}
                            value={form[field]}
                            onChange={(e) => setForm((f) => ({ ...f, [field]: parseFloat(e.target.value) || 0 }))}
                            className="w-full h-8 px-2 text-right font-mono text-sm rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setEditingMetrics(false); }} className="gap-1 h-7 text-xs">
                        <X className="w-3 h-3" /> Cancelar
                      </Button>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSaveMetrics(); }} className="gap-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Save className="w-3 h-3" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Clique em Editar para alterar Gasto, Cliques, Conversões e ROAS.</p>
                )}
              </div>
            )}

            {/* Keyword stats table */}
            {hasKeywordStats && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Destaques — Palavras-chave
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Palavra-chave</th>
                        <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Tipo</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Impressões</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Cliques</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">CTR</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Gasto</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">CPC</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Conv.</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">CPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.keywordStats!.map((kw, i) => (
                        <tr key={i} className={cn("border-b border-border/50 last:border-0", i % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                          <td className="px-3 py-2 font-mono text-foreground font-medium">{kw.keyword}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={cn("inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border", MATCH_COLORS[kw.matchType])}>
                              {kw.matchType}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatNumber(kw.impressions)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatNumber(kw.clicks)}</td>
                          <td className="px-3 py-2 text-right font-mono text-[#4285F4]">{formatPercent(kw.ctr)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(kw.spend)}</td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatCurrency(kw.cpc)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatNumber(kw.conversions)}</td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-400">{formatCurrency(kw.cpa)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Assets */}
            {hasAssets && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Recursos</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.assets!.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="truncate max-w-[320px]">{a}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {hasVideos && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Vídeos</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.videos!.map((v, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <Video className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[300px]">{v}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CampaignTypeCard({ data, isAdmin, onSave }: { data: GoogleCampaignType; isAdmin?: boolean; onSave?: (updated: GoogleCampaignType) => void }) {
  const accent = TYPE_COLORS[data.type] ?? "#888";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ cost: data.cost, clicks: data.clicks, conversions: data.conversions, roas: data.roas });

  function handleSave() {
    onSave?.({ ...data, ...form });
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-border/80 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent }} />
          <span className="text-sm font-semibold">{data.type}</span>
        </div>
        {isAdmin && !editing && (
          <button onClick={() => { setForm({ cost: data.cost, clicks: data.clicks, conversions: data.conversions, roas: data.roas }); setEditing(true); }}
            className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all" title="Editar">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          {([
            { field: "cost",        label: "Custo (R$)",  step: "0.01" },
            { field: "clicks",      label: "Cliques",     step: "1"    },
            { field: "conversions", label: "Conversões",  step: "0.1"  },
            { field: "roas",        label: "ROAS",        step: "0.01" },
          ] as { field: keyof typeof form; label: string; step: string }[]).map(({ field, label, step }) => (
            <div key={field} className="flex items-center justify-between gap-2">
              <label className="text-[11px] text-muted-foreground shrink-0">{label}</label>
              <input type="number" min={0} step={step} value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: parseFloat(e.target.value) || 0 }))}
                className="w-28 h-7 px-2 text-right font-mono text-xs rounded border border-border bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          ))}
          <div className="flex justify-end gap-1.5 pt-1">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditing(false)}>
              <X className="w-3 h-3" /> Cancelar
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>
              <Save className="w-3 h-3" /> Salvar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold tracking-tight" style={{ color: accent }}>{formatCurrency(data.cost)}</p>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 pt-1 border-t border-border/50">
            <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Cliques</p><p className="text-sm font-semibold font-mono">{formatNumber(data.clicks)}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Conversões</p><p className="text-sm font-semibold font-mono">{formatNumber(data.conversions)}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">ROAS</p><p className="text-sm font-semibold font-mono text-emerald-400">{formatMultiplier(data.roas)}</p></div>
          </div>
        </>
      )}
    </div>
  );
}

export default function GoogleAdsPage() {
  const { user } = useAuth();
  const { dateRange } = useDateRange();
  const [kpis, setKpis] = useState<GoogleKPIs | null>(null);
  const [clicksConv, setClicksConv] = useState<GoogleClicksConversionsPoint[]>([]);
  const [campaignTypes, setCampaignTypes] = useState<GoogleCampaignType[]>([]);
  const [campaigns, setCampaigns] = useState<GoogleCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    const uid = user.role === "viewer" ? "user-1" : user.id;
    const integrations = getUserIntegrations(uid);
    if (!integrations.google.connected) { setConnected(false); setLoading(false); return; }
    setConnected(true); setLoading(true);
    const manualKPIs = getManualSection<GoogleKPIs>("google.kpis");
    const manualCampaigns = getManualSection<GoogleCampaign[]>("google.campaigns");
    const manualCampaignTypes = getManualSection<GoogleCampaignType[]>("google.campaignTypes");
    Promise.all([
      manualKPIs ? Promise.resolve(manualKPIs) : fetchGoogleAdsKPIs(uid, dateRange),
      fetchGoogleClicksConversions(uid, dateRange),
      manualCampaignTypes ? Promise.resolve(manualCampaignTypes) : fetchGoogleCampaignTypes(uid, dateRange),
      manualCampaigns ? Promise.resolve(manualCampaigns) : fetchGoogleActiveCampaigns(uid, dateRange),
    ]).then(([k, cc, ct, c]) => { setKpis(k); setClicksConv(cc); setCampaignTypes(ct); setCampaigns(c); setLoading(false); });
  }, [user, dateRange]);

  function saveKPI(field: keyof GoogleKPIs) {
    return (value: number, previousValue: number) => {
      if (!kpis) return;
      const updated = { ...kpis, [field]: { ...kpis[field], value, previousValue } };
      setKpis(updated);
      setManualSection("google.kpis", updated);
    };
  }

  function handleSaveCampaign(id: string, spend: number, clicks: number, conversions: number, roas: number) {
    const updated = campaigns.map((c) =>
      c.id === id ? { ...c, spend, clicks, conversions, roas } : c
    );
    setCampaigns(updated);
    setManualSection("google.campaigns", updated);
  }

  function handleSaveCampaignType(updated: GoogleCampaignType) {
    const next = campaignTypes.map((ct) => ct.type === updated.type ? updated : ct);
    setCampaignTypes(next);
    setManualSection("google.campaignTypes", next);
  }

  if (!connected) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#4285F4]/10 flex items-center justify-center"><WifiOff className="w-7 h-7 text-[#4285F4]" /></div>
      <h2 className="text-xl font-semibold">Google Ads não conectado</h2>
      <p className="text-muted-foreground max-w-sm text-sm">Conecte sua conta Google Ads para monitorar cliques, conversões, ROAS e parcela de impressões.</p>
      <Button asChild><Link href="/settings">Ir para Integrações</Link></Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading || !kpis ? Array.from({ length: 8 }).map((_, i) => <KPICardSkeleton key={i} />) : (
          <>
            <KPICard title="Custo Total"           data={kpis.cost}              delay={0}    invertTrend isEditable={isAdmin} onSave={saveKPI("cost")} />
            <KPICard title="Cliques"               data={kpis.clicks}            delay={0.04}             isEditable={isAdmin} onSave={saveKPI("clicks")} />
            <KPICard title="Conversões"            data={kpis.conversions}       delay={0.08}             isEditable={isAdmin} onSave={saveKPI("conversions")} />
            <KPICard title="Custo / Conversão"     data={kpis.costPerConversion} delay={0.12} invertTrend isEditable={isAdmin} onSave={saveKPI("costPerConversion")} />
            <KPICard title="CTR"                   data={kpis.ctr}               delay={0.16}             isEditable={isAdmin} onSave={saveKPI("ctr")} />
            <KPICard title="CPC Médio"             data={kpis.avgCpc}            delay={0.20} invertTrend isEditable={isAdmin} onSave={saveKPI("avgCpc")} />
            <KPICard title="ROAS"                  data={kpis.roas}              delay={0.24}             isEditable={isAdmin} onSave={saveKPI("roas")} />
            <KPICard title="Parcela de Impressões" data={kpis.impressionShare}   delay={0.28}             isEditable={isAdmin} onSave={saveKPI("impressionShare")} />
          </>
        )}
      </div>

      {/* Cliques vs Conversões */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tendência: Cliques vs. Conversões</CardTitle><CardDescription className="text-xs">Evolução diária no período selecionado</CardDescription></CardHeader>
          <CardContent>{loading || clicksConv.length === 0 ? <Skeleton className="h-[260px] w-full" /> : <ClicksConversionsChart data={clicksConv} />}</CardContent>
        </Card>
      </motion.div>

      {/* Campaign type cards + pie */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div><h3 className="text-sm font-semibold">Campanhas por Tipo</h3><p className="text-xs text-muted-foreground mt-0.5">Performance por tipo de campanha no período</p></div>
          <div className="grid grid-cols-2 gap-3">
            {loading || campaignTypes.length === 0 ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[140px] w-full rounded-xl" />) : campaignTypes.map((ct) => <CampaignTypeCard key={ct.type} data={ct} isAdmin={isAdmin} onSave={handleSaveCampaignType} />)}
          </div>
        </div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Distribuição de Spend</CardTitle><CardDescription className="text-xs">% do orçamento por tipo</CardDescription></CardHeader>
          <CardContent>{loading || campaignTypes.length === 0 ? <Skeleton className="h-[240px] w-full" /> : <CampaignTypePieChart data={campaignTypes} />}</CardContent>
        </Card>
      </motion.div>

      {/* Active campaign list */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
        <div className="mb-3"><h3 className="text-sm font-semibold">Campanhas Ativas</h3><p className="text-xs text-muted-foreground mt-0.5">Palavras-chave, recursos e vídeos em destaque por campanha</p></div>
        <div className="space-y-3">
          {loading || campaigns.length === 0
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[160px] w-full rounded-xl" />)
            : campaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  c={c}
                  isAdmin={isAdmin}
                  onSaveCampaign={handleSaveCampaign}
                />
              ))
          }
        </div>
      </motion.div>
    </div>
  );
}
