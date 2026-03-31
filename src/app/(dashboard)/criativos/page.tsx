"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ChevronDown, ExternalLink, PlayCircle, ImageIcon, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCriativos,
  addCriativo,
  updateCriativo,
  deleteCriativo,
  type Criativo,
  type CriativoStatus,
} from "@/services/criativos.service";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function parseYouTube(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {/* */}
  return null;
}

interface InstagramMedia {
  shortcode: string;
  type: "p" | "reel" | "tv";
}

function parseInstagram(url: string): InstagramMedia | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("instagram.com") && !u.hostname.includes("instagr.am")) return null;
    const match = u.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (match) return { type: match[1] as InstagramMedia["type"], shortcode: match[2] };
  } catch {/* */}
  return null;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i.test(url);
}

function fmtCurrency(v: number) {
  if (!v && v !== 0) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtNumber(v: number) {
  if (!v && v !== 0) return "—";
  return v.toLocaleString("pt-BR");
}

/* ─── media preview ───────────────────────────────────────────────────────── */

/* Instagram SVG icon */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#FCAF45" />
          <stop offset="50%" stopColor="#F77737" />
          <stop offset="75%" stopColor="#F56040" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad)" />
      <rect x="6.5" y="6.5" width="11" height="11" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2.8" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16.5" cy="7.5" r="1" fill="white" />
    </svg>
  );
}

function MediaPreview({ url }: { url: string }) {
  const ytId = parseYouTube(url);
  const igData = parseInstagram(url);

  /* YouTube embed */
  if (ytId) {
    return (
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full rounded-lg"
          src={`https://www.youtube.com/embed/${ytId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Criativo"
        />
      </div>
    );
  }

  /* Instagram embed (Post / Reel / IGTV) */
  if (igData) {
    const isReel = igData.type === "reel" || igData.type === "tv";
    /* aspect-ratio: Reels são 9:16 (vertical), posts são ~1:1 */
    const paddingTop = isReel ? "177.78%" : "120%";
    const embedUrl = `https://www.instagram.com/${igData.type}/${igData.shortcode}/embed/`;
    return (
      <div className="relative w-full overflow-hidden rounded-lg bg-[#0a0a0a]">
        {/* Header imitando a UI do Instagram */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
          <InstagramIcon className="w-5 h-5 shrink-0" />
          <span className="text-[11px] font-semibold text-white/80">
            {isReel ? "Instagram Reel" : "Instagram Post"}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[10px] text-white/40 hover:text-white/80 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Abrir <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <div className="relative w-full" style={{ paddingTop }}>
          <iframe
            className="absolute inset-0 w-full h-full border-0"
            src={embedUrl}
            allowFullScreen
            scrolling="no"
            title="Instagram"
          />
        </div>
      </div>
    );
  }

  /* Arquivo de vídeo direto */
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        controls
        className="w-full rounded-lg max-h-56 object-contain bg-black"
      />
    );
  }

  /* Imagem direta */
  if (isImageUrl(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Criativo"
        className="w-full rounded-lg max-h-56 object-contain bg-muted"
      />
    );
  }

  /* Fallback genérico */
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center justify-center gap-2 w-full h-36 rounded-lg bg-muted border border-border hover:bg-accent transition-colors text-muted-foreground"
    >
      <Link2 className="w-7 h-7" />
      <span className="text-xs text-center px-3 break-all line-clamp-2">{url}</span>
      <span className="text-xs font-medium text-primary flex items-center gap-1">
        Abrir link <ExternalLink className="w-3 h-3" />
      </span>
    </a>
  );
}

/* ─── status badge / dropdown ─────────────────────────────────────────────── */

const STATUS_CONFIG: Record<CriativoStatus, { label: string; color: string; dot: string }> = {
  em_teste:   { label: "Em Teste",   color: "bg-amber-500/15 text-amber-400 border-amber-500/30",  dot: "bg-amber-400" },
  validado:   { label: "Validado",   color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  descartado: { label: "Descartado", color: "bg-red-500/15 text-red-400 border-red-500/30",        dot: "bg-red-400" },
};

function StatusDropdown({
  status,
  onChange,
}: {
  status: CriativoStatus;
  onChange: (s: CriativoStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[status];

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
          cfg.color
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
        {cfg.label}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          >
            {(Object.keys(STATUS_CONFIG) as CriativoStatus[]).map((s) => {
              const c = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-accent",
                    s === status ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", c.dot)} />
                  {c.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── add/edit modal ──────────────────────────────────────────────────────── */

const EMPTY_FORM = {
  nome: "",
  link: "",
  status: "em_teste" as CriativoStatus,
  cpm: "",
  cliques: "",
  cpc: "",
  leads: "",
  cpl: "",
  ticketMedio: "",
  investimento: "",
};

function CriativoModal({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (data: typeof EMPTY_FORM) => void;
  initial?: typeof EMPTY_FORM;
}) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.link.trim()) return;
    onSave(form);
  }

  const fields: { key: keyof typeof EMPTY_FORM; label: string; placeholder: string }[] = [
    { key: "cpm",         label: "CPM (R$)",          placeholder: "0,00" },
    { key: "cliques",     label: "Cliques",            placeholder: "0" },
    { key: "cpc",         label: "CPC (R$)",           placeholder: "0,00" },
    { key: "leads",       label: "Leads / Vendas",     placeholder: "0" },
    { key: "cpl",         label: "CPL (R$)",           placeholder: "0,00" },
    { key: "ticketMedio", label: "Ticket Médio (R$)",  placeholder: "0,00" },
    { key: "investimento",label: "Investimento (R$)",  placeholder: "0,00" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 26, stiffness: 260 }}
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">{initial ? "Editar Criativo" : "Novo Criativo"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome do criativo</label>
            <input
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Ex: Vídeo depoimento João"
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
          </div>

          {/* Link */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Link do criativo *</label>
            <input
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://youtube.com/... ou URL de imagem"
              required
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Suporta YouTube, vídeos (.mp4), imagens (.jpg/.png) ou qualquer URL.
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status inicial</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STATUS_CONFIG) as CriativoStatus[]).map((s) => {
                const c = STATUS_CONFIG[s];
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => set("status", s)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                      form.status === s ? c.color : "border-border text-muted-foreground bg-transparent hover:bg-accent"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", form.status === s ? c.dot : "bg-muted-foreground")} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Métricas */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Métricas</p>
            <div className="grid grid-cols-2 gap-3">
              {fields.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[11px] text-muted-foreground mb-1 block">{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {initial ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─── criativo card ───────────────────────────────────────────────────────── */

function CriativoCard({
  criativo,
  onStatusChange,
  onDelete,
}: {
  criativo: Criativo;
  onStatusChange: (id: string, status: CriativoStatus) => void;
  onDelete: (id: string) => void;
}) {
  const metrics: { label: string; value: string }[] = [
    { label: "Investimento",   value: fmtCurrency(criativo.investimento) },
    { label: "CPM",            value: fmtCurrency(criativo.cpm) },
    { label: "Cliques",        value: fmtNumber(criativo.cliques) },
    { label: "CPC",            value: fmtCurrency(criativo.cpc) },
    { label: "Leads / Vendas", value: fmtNumber(criativo.leads) },
    { label: "CPL",            value: fmtCurrency(criativo.cpl) },
    { label: "Ticket Médio",   value: fmtCurrency(criativo.ticketMedio) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      layout
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {parseInstagram(criativo.link) ? (
                <InstagramIcon className="w-4 h-4 shrink-0" />
              ) : isImageUrl(criativo.link) ? (
                <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : parseYouTube(criativo.link) || isVideoUrl(criativo.link) ? (
                <PlayCircle className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-medium truncate">
                {criativo.nome || "Criativo sem nome"}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusDropdown
                status={criativo.status}
                onChange={(s) => onStatusChange(criativo.id, s)}
              />
              <button
                onClick={() => onDelete(criativo.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Excluir criativo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body: preview + metrics */}
          <div className="flex flex-col lg:flex-row">
            {/* Preview */}
            <div className="lg:w-80 xl:w-96 shrink-0 p-4 border-b lg:border-b-0 lg:border-r border-border bg-muted/30">
              <MediaPreview url={criativo.link} />
              <a
                href={criativo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">{criativo.link}</span>
              </a>
            </div>

            {/* Metrics */}
            <div className="flex-1 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Métricas
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {metrics.map(({ label, value }) => (
                  <div key={label} className="bg-background rounded-xl border border-border px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-sm font-semibold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── empty state ─────────────────────────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <ImageIcon className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold mb-1">Nenhum criativo cadastrado</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs">
        Adicione seus criativos com link, preview e métricas para acompanhar a performance.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Adicionar primeiro criativo
      </button>
    </div>
  );
}

/* ─── filter bar ──────────────────────────────────────────────────────────── */

type Filter = "todos" | CriativoStatus;

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "todos",      label: "Todos" },
  { value: "em_teste",   label: "Em Teste" },
  { value: "validado",   label: "Validado" },
  { value: "descartado", label: "Descartado" },
];

/* ─── page ────────────────────────────────────────────────────────────────── */

export default function CriativosPage() {
  const [criativos, setCriativos] = useState<Criativo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<Filter>("todos");

  useEffect(() => {
    setCriativos(getCriativos());
  }, []);

  function handleSave(form: typeof EMPTY_FORM) {
    const novo = addCriativo({
      nome: form.nome,
      link: form.link,
      status: form.status,
      cpm: Number(form.cpm) || 0,
      cliques: Number(form.cliques) || 0,
      cpc: Number(form.cpc) || 0,
      leads: Number(form.leads) || 0,
      cpl: Number(form.cpl) || 0,
      ticketMedio: Number(form.ticketMedio) || 0,
      investimento: Number(form.investimento) || 0,
    });
    setCriativos((prev) => [...prev, novo]);
    setShowModal(false);
  }

  function handleStatusChange(id: string, status: CriativoStatus) {
    updateCriativo(id, { status });
    setCriativos((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }

  function handleDelete(id: string) {
    deleteCriativo(id);
    setCriativos((prev) => prev.filter((c) => c.id !== id));
  }

  const filtered = filter === "todos" ? criativos : criativos.filter((c) => c.status === filter);

  const counts = {
    todos:      criativos.length,
    em_teste:   criativos.filter((c) => c.status === "em_teste").length,
    validado:   criativos.filter((c) => c.status === "validado").length,
    descartado: criativos.filter((c) => c.status === "descartado").length,
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter tabs */}
        <div className="inline-flex rounded-xl border border-border p-1 bg-card gap-1 overflow-x-auto">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200",
                filter === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {label}
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                filter === value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {counts[value]}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Criativo
        </button>
      </div>

      {/* List */}
      {criativos.length === 0 ? (
        <EmptyState onAdd={() => setShowModal(true)} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <p className="text-sm">Nenhum criativo com status <strong>{FILTER_OPTIONS.find(f => f.value === filter)?.label}</strong>.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((c) => (
              <CriativoCard
                key={c.id}
                criativo={c}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <CriativoModal
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
