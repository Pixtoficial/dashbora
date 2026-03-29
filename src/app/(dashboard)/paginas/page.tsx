"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  WifiOff, ChevronUp, ChevronDown, ChevronsUpDown,
  ExternalLink, Pencil, Check, X, Plus, Trash2, FlaskConical, Link2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDateRange } from "@/contexts/DateContext";
import { getUserIntegrations } from "@/services/integrations.service";
import { fetchTopPages, type PageData } from "@/services/paginas.service";
import { getManualSection, setManualSection } from "@/services/manual-data.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPercent } from "@/lib/utils";
import Link from "next/link";

/* ─────────────────────────────────────────────────────── types ── */

type SortKey = keyof PageData;
type SortDir = "asc" | "desc";

interface TestedPage {
  id: string;
  name: string;
  url: string;
  conversionRate: number; // 0–100
}

const TESTED_STORE_KEY = "paginas.testadas";

function newTestedPage(): TestedPage {
  return { id: crypto.randomUUID(), name: "", url: "", conversionRate: 0 };
}

/* ────────────────────────────────────────────────────── helpers ── */

function ConversionBadge({ value }: { value: number }) {
  const color =
    value >= 5  ? "bg-emerald-500/15 text-emerald-600 border-emerald-300" :
    value >= 2  ? "bg-yellow-500/15  text-yellow-600  border-yellow-300"  :
                  "bg-rose-500/15    text-rose-600    border-rose-300";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-mono ${color}`}>
      {value.toFixed(2)}%
    </span>
  );
}

/* ══════════════════════════════════════════════════════ PAGE ══════ */

export default function PaginasPage() {
  const { user } = useAuth();
  const { dateRange } = useDateRange();
  const isAdmin = user?.role === "admin";

  /* ── GA4 pages state ── */
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("screenPageViews");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<PageData | null>(null);

  /* ── Tested pages state ── */
  const [testedPages, setTestedPages]       = useState<TestedPage[]>([]);
  const [editingTested, setEditingTested]   = useState<string | null>(null);
  const [editTested, setEditTested]         = useState<TestedPage | null>(null);
  const [addingNew, setAddingNew]           = useState(false);
  const [newRow, setNewRow]                 = useState<TestedPage>(newTestedPage);

  /* ── Load GA4 pages ── */
  useEffect(() => {
    if (!user) return;
    const uid = user.role === "viewer" ? "user-1" : user.id;
    const integrations = getUserIntegrations(uid);
    if (!integrations.ga4.connected) { setConnected(false); setLoading(false); return; }
    setConnected(true);
    setLoading(true);
    fetchTopPages(uid, dateRange)
      .then((fetched) => { setPages(getManualSection<PageData[]>("paginas.data") ?? fetched); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, dateRange]);

  /* ── Load tested pages ── */
  useEffect(() => {
    setTestedPages(getManualSection<TestedPage[]>(TESTED_STORE_KEY) ?? []);
  }, []);

  /* ── GA4 table sort / edit ── */
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  const sorted = [...pages].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });
  function startEdit(page: PageData) { setEditingRow(page.pagePath); setEditValues({ ...page }); }
  function cancelEdit() { setEditingRow(null); setEditValues(null); }
  function saveEdit() {
    if (!editValues) return;
    const updated = pages.map((p) => p.pagePath === editValues.pagePath ? editValues : p);
    setPages(updated);
    setManualSection("paginas.data", updated);
    setEditingRow(null); setEditValues(null);
  }
  const maxViews = pages.reduce((m, p) => Math.max(m, p.screenPageViews), 1);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 ml-1 text-primary" />
      : <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
  }

  /* ── Tested pages CRUD ── */
  function persistTested(data: TestedPage[]) {
    setTestedPages(data);
    setManualSection(TESTED_STORE_KEY, data);
  }
  function startEditTested(row: TestedPage) { setEditingTested(row.id); setEditTested({ ...row }); }
  function cancelEditTested() { setEditingTested(null); setEditTested(null); }
  function saveEditTested() {
    if (!editTested) return;
    persistTested(testedPages.map((r) => r.id === editTested.id ? editTested : r));
    setEditingTested(null); setEditTested(null);
  }
  function deleteTested(id: string) { persistTested(testedPages.filter((r) => r.id !== id)); }
  function confirmNew() {
    if (!newRow.name.trim()) return;
    persistTested([...testedPages, { ...newRow, id: crypto.randomUUID() }]);
    setAddingNew(false);
    setNewRow(newTestedPage());
  }
  function cancelNew() { setAddingNew(false); setNewRow(newTestedPage()); }

  /* ── Not connected ── */
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#E37400]/10 flex items-center justify-center">
          <WifiOff className="w-7 h-7 text-[#E37400]" />
        </div>
        <h2 className="text-xl font-semibold">GA4 não conectado</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Conecte o Google Analytics 4 para ver as páginas mais visitadas.
        </p>
        <Button asChild><Link href="/settings">Ir para Integrações</Link></Button>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="space-y-5 max-w-[1200px]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Tabs defaultValue="visitadas">
          <TabsList className="mb-1">
            <TabsTrigger value="visitadas">Páginas Visitadas</TabsTrigger>
            <TabsTrigger value="testadas" className="gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" />
              Páginas Testadas
            </TabsTrigger>
          </TabsList>

          {/* ══════════ TAB 1 — Páginas Visitadas ══════════ */}
          <TabsContent value="visitadas">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Páginas Mais Visitadas</CardTitle>
                <CardDescription className="text-xs">
                  Fonte: GA4 Data API · dimensão pagePath · ordenado por visualizações
                  {isAdmin && <span className="ml-2 text-amber-500">· Clique no lápis para editar</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pb-0">
                {loading ? (
                  <div className="p-5 space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
                  </div>
                ) : (
                  <div className="rounded-b-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border">
                          <TableHead className="w-6 text-center">#</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("pageTitle")}>
                            <span className="inline-flex items-center">Página <SortIcon k="pageTitle" /></span>
                          </TableHead>
                          <TableHead className="cursor-pointer text-right" onClick={() => handleSort("screenPageViews")}>
                            <span className="inline-flex items-center justify-end w-full">Visualizações <SortIcon k="screenPageViews" /></span>
                          </TableHead>
                          <TableHead className="cursor-pointer text-right" onClick={() => handleSort("sessions")}>
                            <span className="inline-flex items-center justify-end w-full">Sessões <SortIcon k="sessions" /></span>
                          </TableHead>
                          <TableHead className="cursor-pointer text-right" onClick={() => handleSort("engagementRate")}>
                            <span className="inline-flex items-center justify-end w-full">Engajamento <SortIcon k="engagementRate" /></span>
                          </TableHead>
                          <TableHead className="text-right">Share</TableHead>
                          {isAdmin && <TableHead className="w-16 text-center">Ação</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((page, i) => {
                          const share = (page.screenPageViews / maxViews) * 100;
                          const isEditing = editingRow === page.pagePath;

                          if (isEditing && editValues) {
                            return (
                              <TableRow key={page.pagePath} className="border-border bg-amber-50/40">
                                <TableCell className="text-center text-muted-foreground text-xs w-6">{i + 1}</TableCell>
                                <TableCell className="max-w-xs">
                                  <div>
                                    <div className="font-medium text-sm truncate">{page.pageTitle || page.pagePath}</div>
                                    <div className="text-xs text-muted-foreground font-mono truncate">{page.pagePath}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <input type="number" min={0} value={editValues.screenPageViews}
                                    onChange={(e) => setEditValues({ ...editValues, screenPageViews: parseInt(e.target.value) || 0 })}
                                    className="w-24 h-7 px-2 text-right font-mono text-sm rounded border border-border bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary" />
                                </TableCell>
                                <TableCell className="text-right">
                                  <input type="number" min={0} value={editValues.sessions}
                                    onChange={(e) => setEditValues({ ...editValues, sessions: parseInt(e.target.value) || 0 })}
                                    className="w-24 h-7 px-2 text-right font-mono text-sm rounded border border-border bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary" />
                                </TableCell>
                                <TableCell className="text-right">
                                  <input type="number" min={0} max={1} step={0.01} value={editValues.engagementRate}
                                    onChange={(e) => setEditValues({ ...editValues, engagementRate: parseFloat(e.target.value) || 0 })}
                                    className="w-24 h-7 px-2 text-right font-mono text-sm rounded border border-border bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary" />
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">—</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={saveEdit} className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500 transition-colors" title="Salvar">
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={cancelEdit} className="p-1 rounded-md hover:bg-destructive/20 text-muted-foreground transition-colors" title="Cancelar">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return (
                            <TableRow key={page.pagePath} className="border-border group">
                              <TableCell className="text-center text-muted-foreground text-xs w-6">{i + 1}</TableCell>
                              <TableCell className="max-w-xs">
                                <div>
                                  <div className="font-medium text-sm truncate flex items-center gap-1.5">
                                    {page.pageTitle || page.pagePath}
                                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono truncate">{page.pagePath}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold">{formatNumber(page.screenPageViews)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatNumber(page.sessions)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatPercent(page.engagementRate * 100)}</TableCell>
                              <TableCell className="text-right w-28">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8 text-right font-mono">{share.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-center">
                                  <button onClick={() => startEdit(page)}
                                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all" title="Editar linha">
                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════ TAB 2 — Páginas Testadas ══════════ */}
          <TabsContent value="testadas">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-violet-500" />
                      Páginas Testadas
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Páginas em teste com seus links e taxas de conversão. Dados inseridos manualmente.
                    </CardDescription>
                  </div>
                  {isAdmin && !addingNew && (
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0 h-8 text-xs"
                      onClick={() => setAddingNew(true)}>
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar página
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0 pb-0">
                <div className="rounded-b-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="w-8 text-center">#</TableHead>
                        <TableHead>Nome da Página</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead className="text-right">Conversão</TableHead>
                        {isAdmin && <TableHead className="w-20 text-center">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>

                      {/* ── Add new row ── */}
                      {addingNew && (
                        <TableRow className="bg-violet-50/40 border-border">
                          <TableCell className="text-center text-muted-foreground text-xs">
                            <Plus className="w-3.5 h-3.5 mx-auto text-violet-400" />
                          </TableCell>
                          <TableCell>
                            <Input
                              autoFocus
                              placeholder="Ex: Landing Page Verão"
                              value={newRow.name}
                              onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
                              className="h-7 text-sm bg-white text-zinc-800"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="https://..."
                              value={newRow.url}
                              onChange={(e) => setNewRow({ ...newRow, url: e.target.value })}
                              className="h-7 text-sm font-mono bg-white text-zinc-800"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                placeholder="0.00"
                                value={newRow.conversionRate || ""}
                                onChange={(e) => setNewRow({ ...newRow, conversionRate: parseFloat(e.target.value) || 0 })}
                                className="w-20 h-7 px-2 text-right font-mono text-sm rounded border border-border bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={confirmNew}
                                className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500 transition-colors" title="Confirmar">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={cancelNew}
                                className="p-1 rounded-md hover:bg-destructive/20 text-muted-foreground transition-colors" title="Cancelar">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* ── Existing rows ── */}
                      {testedPages.length === 0 && !addingNew && (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-12 text-muted-foreground text-sm">
                            <FlaskConical className="w-8 h-8 mx-auto mb-3 opacity-20" />
                            {isAdmin
                              ? "Nenhuma página testada ainda. Clique em \"Adicionar página\" para começar."
                              : "Nenhuma página testada cadastrada."}
                          </TableCell>
                        </TableRow>
                      )}

                      {testedPages.map((row, i) => {
                        const isEditing = editingTested === row.id;

                        if (isEditing && editTested) {
                          return (
                            <TableRow key={row.id} className="bg-amber-50/40 border-border">
                              <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                              <TableCell>
                                <Input
                                  autoFocus
                                  value={editTested.name}
                                  onChange={(e) => setEditTested({ ...editTested, name: e.target.value })}
                                  className="h-7 text-sm bg-white text-zinc-800"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={editTested.url}
                                  onChange={(e) => setEditTested({ ...editTested, url: e.target.value })}
                                  className="h-7 text-sm font-mono bg-white text-zinc-800"
                                  placeholder="https://..."
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    value={editTested.conversionRate}
                                    onChange={(e) => setEditTested({ ...editTested, conversionRate: parseFloat(e.target.value) || 0 })}
                                    className="w-20 h-7 px-2 text-right font-mono text-sm rounded border border-border bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={saveEditTested}
                                    className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500 transition-colors" title="Salvar">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={cancelEditTested}
                                    className="p-1 rounded-md hover:bg-destructive/20 text-muted-foreground transition-colors" title="Cancelar">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return (
                          <TableRow key={row.id} className="border-border group">
                            <TableCell className="text-center text-muted-foreground text-xs w-8">{i + 1}</TableCell>
                            <TableCell>
                              <span className="font-medium text-sm">{row.name || "—"}</span>
                            </TableCell>
                            <TableCell>
                              {row.url ? (
                                <a
                                  href={row.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline underline-offset-2 max-w-xs truncate"
                                >
                                  <Link2 className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{row.url}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <ConversionBadge value={row.conversionRate} />
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => startEditTested(row)}
                                    className="p-1 rounded-md hover:bg-accent transition-colors" title="Editar">
                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                  <button onClick={() => deleteTested(row.id)}
                                    className="p-1 rounded-md hover:bg-rose-500/15 transition-colors" title="Excluir">
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  </button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* ── Summary footer ── */}
                {testedPages.length > 0 && (
                  <div className="flex items-center gap-6 px-4 py-3 border-t border-border text-xs text-muted-foreground">
                    <span>{testedPages.length} página{testedPages.length !== 1 ? "s" : ""} cadastrada{testedPages.length !== 1 ? "s" : ""}</span>
                    <span>
                      Média de conversão:{" "}
                      <span className="font-semibold text-foreground">
                        {(testedPages.reduce((s, r) => s + r.conversionRate, 0) / testedPages.length).toFixed(2)}%
                      </span>
                    </span>
                    <span>
                      Melhor:{" "}
                      <span className="font-semibold text-emerald-600">
                        {Math.max(...testedPages.map((r) => r.conversionRate)).toFixed(2)}%
                      </span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
