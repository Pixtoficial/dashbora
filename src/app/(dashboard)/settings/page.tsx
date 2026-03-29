"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchCredentialStatus,
  syncIntegrationsFromCredentials,
  CredentialStatus,
} from "@/services/integrations.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PlatformInfo {
  key: keyof CredentialStatus;
  name: string;
  description: string;
  color: string;
  bg: string;
  logo: string;
  envVars: { name: string; description: string }[];
  docsUrl: string;
}

const PLATFORMS: PlatformInfo[] = [
  {
    key: "meta",
    name: "Meta Ads",
    description: "Facebook & Instagram Ads — importe campanhas, gastos, ROAS e conversões via Marketing API.",
    color: "text-[#1877F2]",
    bg: "bg-[#1877F2]/10",
    logo: "f",
    docsUrl: "https://developers.facebook.com/docs/marketing-api/get-started",
    envVars: [
      { name: "META_ACCESS_TOKEN",  description: "Token de Sistema do Business Manager" },
      { name: "META_AD_ACCOUNT_ID", description: "ID da conta de anúncios (ex: act_123456)" },
    ],
  },
  {
    key: "google",
    name: "Google Ads",
    description: "Search, Performance Max, Display e YouTube — métricas via Google Ads API (REST).",
    color: "text-[#4285F4]",
    bg: "bg-[#4285F4]/10",
    logo: "G",
    docsUrl: "https://developers.google.com/google-ads/api/docs/get-started/introduction",
    envVars: [
      { name: "GOOGLE_ADS_CLIENT_ID",       description: "OAuth2 Client ID" },
      { name: "GOOGLE_ADS_CLIENT_SECRET",   description: "OAuth2 Client Secret" },
      { name: "GOOGLE_ADS_REFRESH_TOKEN",   description: "Refresh token OAuth2" },
      { name: "GOOGLE_ADS_DEVELOPER_TOKEN", description: "Developer token da conta MCC" },
      { name: "GOOGLE_ADS_CUSTOMER_ID",     description: "Customer ID (ex: 123-456-7890)" },
    ],
  },
  {
    key: "ga4",
    name: "Google Analytics (GA4)",
    description: "Sessões, usuários, engajamento e eventos de conversão via GA4 Data API.",
    color: "text-[#E37400]",
    bg: "bg-[#E37400]/10",
    logo: "A",
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries",
    envVars: [
      { name: "GA4_PROPERTY_ID",  description: "ID da propriedade GA4 (só os números)" },
      { name: "GA4_CLIENT_EMAIL", description: "E-mail da Service Account" },
      { name: "GA4_PRIVATE_KEY",  description: "Chave privada da Service Account (PEM)" },
    ],
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === "viewer") {
      router.replace("/overview");
      return;
    }
    loadStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadStatus() {
    setLoading(true);
    try {
      const s = await fetchCredentialStatus();
      setStatus(s);
      await syncIntegrationsFromCredentials(user!.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setSyncing(true);
    await loadStatus();
    setSyncing(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Integrações</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Status das credenciais configuradas via variáveis de ambiente no servidor.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={syncing || loading}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {PLATFORMS.map((platform, i) => {
        const cred = status?.[platform.key];
        const configured = cred?.configured ?? false;
        const accountId =
          (cred as any)?.accountId ??
          (cred as any)?.customerId ??
          (cred as any)?.propertyId;

        return (
          <motion.div
            key={platform.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${platform.bg} flex items-center justify-center font-bold text-lg ${platform.color}`}>
                      {platform.logo}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{platform.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1">
                        {loading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        ) : configured ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-medium">Credenciais configuradas</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Sem credenciais</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={configured ? "success" : "secondary"}>
                    {loading ? "…" : configured ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{platform.description}</p>

                {configured && accountId && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono truncate">{accountId}</span>
                  </div>
                )}

                {!loading && !configured && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Adicione ao <code className="font-mono text-foreground">.env.local</code>:
                    </div>
                    <div className="space-y-1.5">
                      {platform.envVars.map((v) => (
                        <div key={v.name} className="flex items-start gap-2">
                          <code className="font-mono text-[11px] text-primary shrink-0">{v.name}</code>
                          <span className="text-[11px] text-muted-foreground"># {v.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 px-2" asChild>
                  <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" />
                    Ver documentação da API
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
      >
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-5">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
                .env
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Como configurar</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Crie ou edite <code className="font-mono text-foreground">.env.local</code> na raiz do projeto</li>
                  <li>Adicione as variáveis de cada plataforma desejada</li>
                  <li>Reinicie o servidor: <code className="font-mono text-foreground">npm run dev</code></li>
                  <li>Clique em <strong>Atualizar</strong> para verificar o status</li>
                </ol>
                <p className="text-xs text-muted-foreground pt-1">
                  Sem credenciais, o dashboard exibe dados simulados automaticamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
