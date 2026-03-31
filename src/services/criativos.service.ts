export type CriativoStatus = "em_teste" | "validado" | "descartado";

export interface Criativo {
  id: string;
  nome: string;
  link: string;
  status: CriativoStatus;
  cpm: number;
  cliques: number;
  cpc: number;
  leads: number;
  cpl: number;
  ticketMedio: number;
  investimento: number;
  criadoEm: string;
}

const STORAGE_KEY = "dash-criativos";

export function getCriativos(): Criativo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCriativos(criativos: Criativo[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(criativos));
}

export function addCriativo(c: Omit<Criativo, "id" | "criadoEm">): Criativo {
  const novo: Criativo = {
    ...c,
    id: crypto.randomUUID(),
    criadoEm: new Date().toISOString(),
  };
  const lista = getCriativos();
  saveCriativos([...lista, novo]);
  return novo;
}

export function updateCriativo(id: string, updates: Partial<Criativo>): void {
  const lista = getCriativos().map((c) => (c.id === id ? { ...c, ...updates } : c));
  saveCriativos(lista);
}

export function deleteCriativo(id: string): void {
  saveCriativos(getCriativos().filter((c) => c.id !== id));
}
