import { UserIntegrations } from "@/types";

const STORAGE_KEY = "dash_trafego_integrations";

export interface CredentialStatus {
  meta:   { configured: boolean; accountId: string | null };
  google: { configured: boolean; customerId: string | null };
  ga4:    { configured: boolean; propertyId: string | null };
}

/** Fetches which credentials are actually configured on the server. */
export async function fetchCredentialStatus(): Promise<CredentialStatus> {
  const res = await fetch("/api/credentials", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao verificar credenciais");
  return res.json();
}

/**
 * Sempre retorna todas as plataformas como conectadas.
 * Quando credenciais reais estiverem no .env.local, os dados virão da API.
 * Sem credenciais, os dados virão do mock ou do funil manual.
 */
export function getUserIntegrations(_userId: string): UserIntegrations {
  return {
    meta:   { connected: true, account: "Materializa" },
    google: { connected: true, account: "Materializa" },
    ga4:    { connected: true, account: "Materializa" },
  };
}

export function saveUserIntegrations(userId: string, integrations: UserIntegrations): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(integrations));
}

export async function syncIntegrationsFromCredentials(userId: string): Promise<UserIntegrations> {
  const status = await fetchCredentialStatus();
  const updated: UserIntegrations = {
    meta:   { connected: true, account: status.meta.configured   ? (status.meta.accountId   ?? "Meta Ads")  : "Materializa" },
    google: { connected: true, account: status.google.configured ? (status.google.customerId ?? "Google Ads"): "Materializa" },
    ga4:    { connected: true, account: status.ga4.configured    ? (status.ga4.propertyId    ?? "GA4")       : "Materializa" },
  };
  saveUserIntegrations(userId, updated);
  return updated;
}
