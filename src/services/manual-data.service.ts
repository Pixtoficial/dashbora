/**
 * manual-data.service.ts
 *
 * Camada de persistência para dados inseridos manualmente pelo admin.
 * - Leitura: síncrona via localStorage (rápida, sem delay de UI)
 * - Escrita: localStorage imediato + sync assíncrono para o servidor (Redis)
 * - initStore(): chamado no boot do app para hidratar localStorage com dados do servidor
 */

const STORE_KEY = "dash_manual_v1";

type ManualStore = Record<string, unknown>;

function loadStore(): ManualStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as ManualStore) : {};
  } catch {
    return {};
  }
}

function saveStore(store: ManualStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {}
}

/** Retorna dados manuais para uma seção, ou null se não houver. */
export function getManualSection<T>(section: string): T | null {
  const store = loadStore();
  const val = store[section];
  return val !== undefined ? (val as T) : null;
}

/** Persiste dados manuais para uma seção (localStorage + servidor). */
export function setManualSection(section: string, data: unknown): void {
  const store = loadStore();
  store[section] = data;
  saveStore(store);

  // Sync para o servidor em background (não bloqueia a UI)
  fetch("/api/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, data }),
  }).catch(() => {
    // Falha silenciosa — dado já está salvo no localStorage
  });
}

/** Remove dados manuais de uma seção (volta ao mock). */
export function clearManualSection(section: string): void {
  const store = loadStore();
  delete store[section];
  saveStore(store);

  fetch("/api/store", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section }),
  }).catch(() => {});
}

/** Verifica se há dados manuais para uma seção. */
export function hasManualSection(section: string): boolean {
  const store = loadStore();
  return section in store;
}

/**
 * Carrega todos os dados do servidor e hidrata o localStorage.
 * Chamar uma vez na inicialização do app para garantir que todos os
 * dispositivos/usuários vejam os mesmos dados.
 */
export async function initStore(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/store");
    if (!res.ok) return;
    const serverStore = await res.json() as ManualStore;
    if (Object.keys(serverStore).length === 0) return;
    // Mescla: servidor tem prioridade sobre localStorage local
    const localStore = loadStore();
    const merged = { ...localStore, ...serverStore };
    saveStore(merged);
  } catch {
    // Sem Redis configurado ou offline — continua com localStorage
  }
}
