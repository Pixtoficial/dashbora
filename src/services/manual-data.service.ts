/**
 * manual-data.service.ts
 *
 * Camada de persistência para dados inseridos manualmente pelo admin (mw@trafego.com).
 * Armazenados em localStorage, visíveis para todos os usuários.
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

/** Persiste dados manuais para uma seção. */
export function setManualSection(section: string, data: unknown): void {
  const store = loadStore();
  store[section] = data;
  saveStore(store);
}

/** Remove dados manuais de uma seção (volta ao mock). */
export function clearManualSection(section: string): void {
  const store = loadStore();
  delete store[section];
  saveStore(store);
}

/** Verifica se há dados manuais para uma seção. */
export function hasManualSection(section: string): boolean {
  const store = loadStore();
  return section in store;
}
