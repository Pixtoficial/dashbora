"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { WifiOff, Users, UserPlus, RefreshCcw, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDateRange } from "@/contexts/DateContext";
import { getUserIntegrations } from "@/services/integrations.service";
import { getManualSection, setManualSection } from "@/services/manual-data.service";
import { fetchUsersData, type UsersDayData, type UsersKPIs } from "@/services/usuarios.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { KPICard, KPICardSkeleton } from "@/components/dashboard/KPICard";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover shadow-xl px-4 py-3 text-sm space-y-1.5">
      <p className="font-semibold text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-xs text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function UsuariosPage() {
  const { user } = useAuth();
  const { dateRange } = useDateRange();
  const [days, setDays] = useState<UsersDayData[]>([]);
  const [kpis, setKpis] = useState<UsersKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    const uid = user.role === "viewer" ? "user-1" : user.id;
    const integrations = getUserIntegrations(uid);
    if (!integrations.ga4.connected) { setConnected(false); setLoading(false); return; }
    setConnected(true); setLoading(true);
    const manualKPIs = getManualSection<UsersKPIs>("usuarios.kpis");
    fetchUsersData(uid, dateRange).then(({ days, kpis: fetched }) => {
      setDays(days);
      setKpis(manualKPIs ?? fetched);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, dateRange]);

  function saveKPI(field: keyof UsersKPIs) {
    return (value: number, _previousValue: number) => {
      if (!kpis) return;
      const updated = { ...kpis, [field]: value };
      setKpis(updated);
      setManualSection("usuarios.kpis", updated);
    };
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#E37400]/10 flex items-center justify-center">
          <WifiOff className="w-7 h-7 text-[#E37400]" />
        </div>
        <h2 className="text-xl font-semibold">GA4 não conectado</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Conecte o Google Analytics 4 para visualizar métricas de usuários ativos e novos usuários.
        </p>
        <Button asChild><Link href="/settings">Ir para Integrações</Link></Button>
      </div>
    );
  }

  const kpiData = (value: number, prev: number) => ({
    value, previousValue: prev, format: "number" as const,
  });

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading || !kpis ? (
          Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <KPICard
              title="Usuários Ativos"
              data={kpiData(kpis.totalActiveUsers, kpis.totalActiveUsers * 0.88)}
              delay={0}
              icon={<Users className="w-3.5 h-3.5" />}
              isEditable={isAdmin}
              onSave={saveKPI("totalActiveUsers")}
            />
            <KPICard
              title="Novos Usuários"
              data={kpiData(kpis.totalNewUsers, kpis.totalNewUsers * 0.84)}
              delay={0.05}
              icon={<UserPlus className="w-3.5 h-3.5" />}
              isEditable={isAdmin}
              onSave={saveKPI("totalNewUsers")}
            />
            <KPICard
              title="Média Diária"
              data={kpiData(kpis.avgDailyUsers, kpis.avgDailyUsers * 0.91)}
              delay={0.1}
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              isEditable={isAdmin}
              onSave={saveKPI("avgDailyUsers")}
            />
            <KPICard
              title="Taxa de Retorno"
              data={{ value: kpis.returningRate, previousValue: kpis.returningRate * 0.95, format: "percent" }}
              delay={0.15}
              icon={<RefreshCcw className="w-3.5 h-3.5" />}
              isEditable={isAdmin}
              onSave={saveKPI("returningRate")}
            />
          </>
        )}
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Usuários Ativos vs. Novos Usuários</CardTitle>
            <CardDescription className="text-xs">Evolução diária via GA4 · Fonte: activeUsers + newUsers</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || days.length === 0 ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={days} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(240 5% 55%)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(240 5% 55%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="activeUsers" name="Usuários Ativos" stroke="#8B5CF6" strokeWidth={2} fill="url(#activeGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="newUsers" name="Novos Usuários" stroke="#10B981" strokeWidth={2} fill="url(#newGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
