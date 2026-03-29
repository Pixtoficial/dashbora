"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { WifiOff, Users, Activity, MousePointerClick, ShoppingCart, DollarSign, Pencil, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDateRange } from "@/contexts/DateContext";
import { getUserIntegrations } from "@/services/integrations.service";
import { getManualSection, setManualSection } from "@/services/manual-data.service";
import { fetchGA4KPIs, fetchSessionsBySource, fetchGA4Devices, fetchGA4Regions, fetchGA4SessionDuration } from "@/services/ga4.service";
import { KPICard, KPICardSkeleton } from "@/components/dashboard/KPICard";
import { SessionsBySourceChart } from "@/components/charts/SessionsBySourceChart";
import { DeviceBreakdownChart } from "@/components/charts/DeviceBreakdownChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import type { GA4KPIs, SessionsBySource, GA4DeviceBreakdown, GA4RegionBreakdown, GA4SessionDuration } from "@/types";
import Link from "next/link";

/* ─── tiny inline number input ──────────────────────────────────────────── */
function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-24 h-7 px-2 text-right font-mono text-xs rounded border border-border bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

/* ─── editable section wrapper ──────────────────────────────────────────── */
function EditableSection({
  title, description, children, isAdmin, editing, onEdit, onSave, onCancel,
}: {
  title: string; description: string; children: React.ReactNode;
  isAdmin?: boolean; editing: boolean;
  onEdit: () => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
          {isAdmin && (
            editing ? (
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onSave}>
                  <Check className="w-3 h-3" /> Salvar
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onCancel}>
                  <X className="w-3 h-3" /> Cancelar
                </Button>
              </div>
            ) : (
              <button onClick={onEdit} className="p-1 rounded-md hover:bg-accent transition-colors" title="Editar">
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════ PAGE ══════════════ */
export default function GA4Page() {
  const { user } = useAuth();
  const { dateRange } = useDateRange();
  const [kpis, setKpis] = useState<GA4KPIs | null>(null);
  const [sessions, setSessions] = useState<SessionsBySource[]>([]);
  const [devices, setDevices] = useState<GA4DeviceBreakdown[]>([]);
  const [regions, setRegions] = useState<GA4RegionBreakdown[]>([]);
  const [sessionDuration, setSessionDuration] = useState<GA4SessionDuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  // edit state per section
  const [editingDevices, setEditingDevices] = useState(false);
  const [editDevices, setEditDevices] = useState<GA4DeviceBreakdown[]>([]);
  const [editingRegions, setEditingRegions] = useState(false);
  const [editRegions, setEditRegions] = useState<GA4RegionBreakdown[]>([]);
  const [editingDuration, setEditingDuration] = useState(false);
  const [editDuration, setEditDuration] = useState<GA4SessionDuration[]>([]);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    const uid = user.role === "viewer" ? "user-1" : user.id;
    const integrations = getUserIntegrations(uid);
    if (!integrations.ga4.connected) { setConnected(false); setLoading(false); return; }
    setConnected(true); setLoading(true);
    const manualKPIs = getManualSection<GA4KPIs>("ga4.kpis");
    Promise.all([
      manualKPIs ? Promise.resolve(manualKPIs) : fetchGA4KPIs(uid, dateRange),
      fetchSessionsBySource(uid, dateRange),
      fetchGA4Devices(uid, dateRange),
      fetchGA4Regions(uid, dateRange),
      fetchGA4SessionDuration(uid, dateRange),
    ]).then(([k, s, d, r, sd]) => {
      setKpis(k); setSessions(s); setDevices(d); setRegions(r); setSessionDuration(sd);
      setLoading(false);
    });
  }, [user, dateRange]);

  function saveKPI(field: keyof GA4KPIs) {
    return (value: number, previousValue: number) => {
      if (!kpis) return;
      const updated = { ...kpis, [field]: { ...kpis[field], value, previousValue } };
      setKpis(updated);
      setManualSection("ga4.kpis", updated);
    };
  }

  /* ── devices edit ── */
  function startEditDevices() { setEditDevices(devices.map((d) => ({ ...d }))); setEditingDevices(true); }
  function saveDevices() {
    const total = editDevices.reduce((s, d) => s + d.sessions, 0) || 1;
    const fixed = editDevices.map((d) => ({ ...d }));
    setDevices(fixed); setManualSection("ga4.devices", fixed);
    setEditingDevices(false);
  }
  function cancelDevices() { setEditingDevices(false); }

  /* ── regions edit ── */
  function startEditRegions() { setEditRegions(regions.map((r) => ({ ...r }))); setEditingRegions(true); }
  function saveRegions() {
    const total = editRegions.reduce((s, r) => s + r.sessions, 0) || 1;
    const fixed = editRegions.map((r) => ({ ...r, percent: parseFloat(((r.sessions / total) * 100).toFixed(1)) }));
    setRegions(fixed); setManualSection("ga4.regions", fixed);
    setEditingRegions(false);
  }
  function cancelRegions() { setEditingRegions(false); }

  /* ── session duration edit ── */
  function startEditDuration() { setEditDuration(sessionDuration.map((d) => ({ ...d }))); setEditingDuration(true); }
  function saveDuration() {
    setSessionDuration(editDuration); setManualSection("ga4.sessionDuration", editDuration);
    setEditingDuration(false);
  }
  function cancelDuration() { setEditingDuration(false); }

  if (!connected) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#E37400]/10 flex items-center justify-center"><WifiOff className="w-7 h-7 text-[#E37400]" /></div>
      <h2 className="text-xl font-semibold">Google Analytics não conectado</h2>
      <p className="text-muted-foreground max-w-sm text-sm">Conecte sua propriedade GA4 para acompanhar sessões, usuários, engajamento e eventos de conversão.</p>
      <Button asChild><Link href="/settings">Ir para Integrações</Link></Button>
    </div>
  );

  const maxRegionSessions = (editingRegions ? editRegions : regions)[0]?.sessions ?? 1;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {loading || !kpis ? Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />) : (
          <>
            <KPICard title="Usuários"             data={kpis.users}            delay={0}    icon={<Users             className="w-3.5 h-3.5" />} isEditable={isAdmin} onSave={saveKPI("users")} />
            <KPICard title="Sessões"              data={kpis.sessions}         delay={0.05} icon={<Activity          className="w-3.5 h-3.5" />} isEditable={isAdmin} onSave={saveKPI("sessions")} />
            <KPICard title="Taxa de Engajamento"  data={kpis.engagementRate}   delay={0.1}  icon={<MousePointerClick className="w-3.5 h-3.5" />} isEditable={isAdmin} onSave={saveKPI("engagementRate")} />
            <KPICard title="Eventos de Conversão" data={kpis.conversionEvents} delay={0.15} icon={<ShoppingCart      className="w-3.5 h-3.5" />} isEditable={isAdmin} onSave={saveKPI("conversionEvents")} />
            <KPICard title="Receita Total"        data={kpis.revenue}          delay={0.2}  icon={<DollarSign        className="w-3.5 h-3.5" />} isEditable={isAdmin} onSave={saveKPI("revenue")} />
          </>
        )}
      </div>

      {/* Sessões por origem */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sessões por Origem / Mídia</CardTitle>
            <CardDescription className="text-xs">Volume de sessões agrupado por canal de aquisição</CardDescription>
          </CardHeader>
          <CardContent>{loading || sessions.length === 0 ? <Skeleton className="h-[260px] w-full" /> : <SessionsBySourceChart data={sessions} />}</CardContent>
        </Card>
      </motion.div>

      {/* Dispositivo + Região + Tempo de Sessão */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Dispositivo ── */}
        <EditableSection
          title="Dispositivo"
          description="Distribuição de sessões por tipo de dispositivo"
          isAdmin={isAdmin}
          editing={editingDevices}
          onEdit={startEditDevices}
          onSave={saveDevices}
          onCancel={cancelDevices}
        >
          {loading || devices.length === 0 ? (
            <Skeleton className="h-[220px] w-full" />
          ) : editingDevices ? (
            <div className="space-y-3 pt-1">
              {editDevices.map((d, i) => (
                <div key={d.device} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-sm font-medium truncate">{d.device}</span>
                  </div>
                  <NumInput value={editDevices[i].sessions} onChange={(v) => {
                    const copy = [...editDevices];
                    copy[i] = { ...copy[i], sessions: v };
                    setEditDevices(copy);
                  }} />
                </div>
              ))}
            </div>
          ) : (
            <DeviceBreakdownChart data={devices} />
          )}
        </EditableSection>

        {/* ── Região ── */}
        <EditableSection
          title="Região"
          description="Top estados / regiões por sessões"
          isAdmin={isAdmin}
          editing={editingRegions}
          onEdit={startEditRegions}
          onSave={saveRegions}
          onCancel={cancelRegions}
        >
          {loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : editingRegions ? (
            <div className="space-y-2.5 pt-1">
              {editRegions.map((r, i) => (
                <div key={r.region} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate max-w-[130px]">{r.region}</span>
                  <NumInput value={editRegions[i].sessions} onChange={(v) => {
                    const copy = [...editRegions];
                    copy[i] = { ...copy[i], sessions: v };
                    setEditRegions(copy);
                  }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {regions.map((r) => (
                <div key={r.region}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate max-w-[180px]">{r.region}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground font-mono">{formatNumber(r.sessions)}</span>
                      <span className="text-xs font-semibold w-10 text-right">{r.percent.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#4285F4] rounded-full transition-all" style={{ width: `${(r.sessions / maxRegionSessions) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </EditableSection>

        {/* ── Tempo de Sessão ── */}
        <EditableSection
          title="Tempo de Sessão"
          description="Distribuição de usuários por duração"
          isAdmin={isAdmin}
          editing={editingDuration}
          onEdit={startEditDuration}
          onSave={saveDuration}
          onCancel={cancelDuration}
        >
          {loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (() => {
            const data = editingDuration ? editDuration : sessionDuration;
            const total = data.reduce((s, d) => s + d.users, 0) || 1;
            const maxU = Math.max(...data.map((d) => d.users));
            return (
              <div className="space-y-3 pt-1">
                {data.map((d, i) => (
                  <div key={d.bucket}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-medium">{d.bucket}</span>
                      {editingDuration ? (
                        <NumInput value={editDuration[i].users} onChange={(v) => {
                          const copy = [...editDuration];
                          copy[i] = { ...copy[i], users: v };
                          setEditDuration(copy);
                        }} />
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground font-mono">{formatNumber(d.users)}</span>
                          <span className="text-xs font-semibold w-10 text-right">{((d.users / total) * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                    {!editingDuration && (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[#E37400] rounded-full transition-all" style={{ width: `${(d.users / maxU) * 100}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </EditableSection>
      </motion.div>
    </div>
  );
}
