"use client";

import "@xyflow/react/dist/style.css";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type NodeProps,
  type Connection,
  type NodeTypes,
  Panel,
  useReactFlow,
} from "@xyflow/react";
import {
  Plus,
  Trash2,
  ChevronDown,
  Save,
  FolderOpen,
  LayoutTemplate,
  ZoomIn,
  Maximize2,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  STRATEGY_TEMPLATES,
  type StrategyTemplate,
  type StrategyNode,
  type StrategyEdge,
  type StrategyNodeData,
  type NodeSubtype,
} from "@/data/strategy-templates";

/* ─── platform config ─────────────────────────────────────────────────────── */

export const PLATFORMS: Record<string, { label: string; bg: string; text: string; abbr: string }> = {
  meta:      { label: "Meta Ads",      bg: "#1877F2", text: "#fff", abbr: "META" },
  google:    { label: "Google Ads",    bg: "#4285F4", text: "#fff", abbr: "GADS" },
  youtube:   { label: "YouTube Ads",   bg: "#FF0000", text: "#fff", abbr: "YT" },
  linkedin:  { label: "LinkedIn Ads",  bg: "#0A66C2", text: "#fff", abbr: "IN" },
  pinterest: { label: "Pinterest Ads", bg: "#E60023", text: "#fff", abbr: "PIN" },
  tiktok:    { label: "TikTok Ads",    bg: "#010101", text: "#FF0050", abbr: "TT" },
  twitter:   { label: "Twitter / X",   bg: "#000000", text: "#fff", abbr: "X" },
  ga4:       { label: "GA4 Analytics", bg: "#E37400", text: "#fff", abbr: "GA4" },
};

function PlatformBadge({ platform, size = "sm" }: { platform: string; size?: "sm" | "md" }) {
  const cfg = PLATFORMS[platform];
  if (!cfg) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded font-bold leading-none shrink-0",
        size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-[11px] px-2 py-1"
      )}
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.abbr}
    </span>
  );
}

/* ─── node type styles ────────────────────────────────────────────────────── */

const SUBTYPE_STYLES: Record<NodeSubtype, { border: string; bg: string; label: string; icon: string }> = {
  root:     { border: "#8B5CF6", bg: "linear-gradient(135deg,#4C1D95,#6D28D9)", label: "#fff", icon: "⚡" },
  platform: { border: "#334155", bg: "#0F172A",          label: "#F1F5F9", icon: "📡" },
  phase:    { border: "#3B82F6", bg: "#1E3A5F",          label: "#93C5FD", icon: "📅" },
  campaign: { border: "#6366F1", bg: "#1E1B4B",          label: "#C7D2FE", icon: "🎯" },
  audience: { border: "#10B981", bg: "#022C22",          label: "#6EE7B7", icon: "👥" },
  creative: { border: "#EC4899", bg: "#500724",          label: "#F9A8D4", icon: "🎨" },
  metric:   { border: "#F59E0B", bg: "#451A03",          label: "#FCD34D", icon: "📊" },
  funnel:   { border: "#F97316", bg: "#431407",          label: "#FDBA74", icon: "🔻" },
};

/* ─── custom node component ──────────────────────────────────────────────── */

const StrategyNodeComponent = memo(function StrategyNodeComponent({
  data: rawData,
  selected,
}: NodeProps) {
  const data = rawData as StrategyNodeData;
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const styles = SUBTYPE_STYLES[data.subtype] ?? SUBTYPE_STYLES.campaign;
  const isRoot = data.subtype === "root";

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 30);
  }, [editing]);

  function commitEdit() {
    if (editLabel.trim()) data.label = editLabel.trim();
    setEditing(false);
  }

  return (
    <div
      className="relative group"
      style={{
        minWidth: isRoot ? 200 : 160,
        maxWidth: isRoot ? 240 : 210,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: styles.border, border: "none", width: 8, height: 8 }}
      />

      <div
        className={cn(
          "rounded-xl px-3 py-2.5 shadow-xl transition-all duration-150",
          selected ? "ring-2 ring-white/40 shadow-2xl scale-[1.02]" : ""
        )}
        style={{
          background: styles.bg,
          border: `1.5px solid ${styles.border}`,
        }}
        onDoubleClick={() => setEditing(true)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          {data.platform ? (
            <PlatformBadge platform={data.platform} />
          ) : (
            <span className="text-base leading-none select-none">{styles.icon}</span>
          )}

          {editing ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                ref={inputRef}
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") { setEditLabel(data.label); setEditing(false); }
                }}
                className="flex-1 min-w-0 rounded px-1.5 py-0.5 text-xs bg-white/10 text-white outline-none border border-white/30"
              />
              <button onClick={commitEdit} className="p-0.5 rounded hover:bg-white/10">
                <Check className="w-3 h-3 text-white/80" />
              </button>
            </div>
          ) : (
            <span
              className={cn(
                "font-semibold leading-tight whitespace-pre-line",
                isRoot ? "text-sm" : "text-xs"
              )}
              style={{ color: styles.label }}
            >
              {data.label}
            </span>
          )}
        </div>

        {/* Description */}
        {data.description && !editing && (
          <p
            className="text-[10px] leading-snug whitespace-pre-line mt-0.5"
            style={{ color: styles.label + "99" }}
          >
            {data.description}
          </p>
        )}
      </div>

      {/* Edit hint on hover */}
      {!editing && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[9px] text-white/40 whitespace-nowrap">duplo clique para editar</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: styles.border, border: "none", width: 8, height: 8 }}
      />
    </div>
  );
});

const NODE_TYPES: NodeTypes = { strategyNode: StrategyNodeComponent };

/* ─── storage helpers ─────────────────────────────────────────────────────── */

const STORAGE_KEY = "dash-estrategias";

interface SavedProject {
  id: string;
  name: string;
  templateId: string;
  nodes: StrategyNode[];
  edges: StrategyEdge[];
  savedAt: string;
}

function loadProjects(): SavedProject[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}

function saveProject(p: SavedProject) {
  const list = loadProjects().filter((x) => x.id !== p.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, p]));
}

function deleteProject(id: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loadProjects().filter((x) => x.id !== id)));
}

/* ─── canvas inner ────────────────────────────────────────────────────────── */

function CanvasInner({
  initNodes,
  initEdges,
  projectName,
  projectId,
  templateId,
  onSaved,
}: {
  initNodes: StrategyNode[];
  initEdges: StrategyEdge[];
  projectName: string;
  projectId: string;
  templateId: string;
  onSaved: () => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<StrategyNode>(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<StrategyEdge>(initEdges);
  const { fitView } = useReactFlow();

  useEffect(() => {
    setNodes(initNodes);
    setEdges(initEdges);
    setTimeout(() => fitView({ padding: 0.12, duration: 400 }), 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initNodes, initEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: "smoothstep", animated: true }, eds)),
    [setEdges]
  );

  function addNode(subtype: NodeSubtype) {
    const id = `custom-${Date.now()}`;
    const newNode: StrategyNode = {
      id,
      type: "strategyNode",
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
      data: { label: "Novo nó", subtype, description: "Clique duplo para editar" },
    };
    setNodes((ns) => [...ns, newNode]);
  }

  function handleSave() {
    saveProject({
      id: projectId,
      name: projectName,
      templateId,
      nodes,
      edges,
      savedAt: new Date().toISOString(),
    });
    onSaved();
  }

  const ADD_OPTIONS: { subtype: NodeSubtype; label: string }[] = [
    { subtype: "platform",  label: "Plataforma" },
    { subtype: "phase",     label: "Fase / Etapa" },
    { subtype: "campaign",  label: "Campanha" },
    { subtype: "audience",  label: "Audiência" },
    { subtype: "creative",  label: "Criativo" },
    { subtype: "metric",    label: "Métrica / KPI" },
    { subtype: "funnel",    label: "Funil" },
  ];

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={NODE_TYPES}
        deleteKeyCode="Delete"
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.2}
        maxZoom={2}
        style={{ background: "#080B14" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1E293B"
        />
        <Controls
          className="!bottom-4 !left-4 !border-0 !shadow-none"
          showInteractive={false}
        />
        <MiniMap
          className="!bottom-4 !right-4 !rounded-xl !border !border-border overflow-hidden"
          nodeColor={(n) => {
            const d = n.data as StrategyNodeData;
            return SUBTYPE_STYLES[d.subtype]?.border ?? "#6366F1";
          }}
          maskColor="rgba(8,11,20,0.85)"
          style={{ background: "#0F172A" }}
        />

        {/* Toolbar panel */}
        <Panel position="top-right" className="flex gap-2">
          {/* Add node dropdown */}
          <AddNodeDropdown options={ADD_OPTIONS} onAdd={addNode} />

          {/* Save */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-lg"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar
          </button>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm">
            {Object.entries(SUBTYPE_STYLES).map(([subtype, s]) => (
              <div key={subtype} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: s.border }}
                />
                <span className="text-[9px] text-white/50 capitalize">{subtype}</span>
              </div>
            ))}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

/* ─── add node dropdown ──────────────────────────────────────────────────── */

function AddNodeDropdown({
  options,
  onAdd,
}: {
  options: { subtype: NodeSubtype; label: string }[];
  onAdd: (s: NodeSubtype) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-accent transition-colors shadow-lg"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar nó
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {options.map(({ subtype, label }) => {
              const s = SUBTYPE_STYLES[subtype];
              return (
                <button
                  key={subtype}
                  onClick={() => { onAdd(subtype); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-accent transition-colors text-left"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.border }} />
                  <span className="text-foreground font-medium">{label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── setup modal ─────────────────────────────────────────────────────────── */

function SetupModal({ onStart }: { onStart: (p: { name: string; template: StrategyTemplate }) => void }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<StrategyTemplate>(STRATEGY_TEMPLATES[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-bold">Nova Estratégia</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Escolha o tipo e o nome do projeto para carregar o template.</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Nome */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome do projeto</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lançamento Curso XYZ — Agosto/2026"
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
          </div>

          {/* Template grid */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Tipo de estratégia</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STRATEGY_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all duration-150 hover:scale-[1.02]",
                    selected.id === t.id
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-background hover:border-border/80 hover:bg-accent"
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-lg mb-2 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: t.color }}
                  >
                    {t.name.slice(0, 1)}
                  </div>
                  <p className="text-xs font-semibold leading-tight">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            disabled={!name.trim()}
            onClick={() => onStart({ name, template: selected })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <LayoutTemplate className="w-4 h-4" />
            Criar mapa mental
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── saved projects panel ───────────────────────────────────────────────── */

function ProjectsPanel({
  onLoad,
  onNew,
}: {
  onLoad: (p: SavedProject) => void;
  onNew: () => void;
}) {
  const [projects, setProjects] = useState<SavedProject[]>([]);

  useEffect(() => { setProjects(loadProjects()); }, []);

  function handleDelete(id: string) {
    deleteProject(id);
    setProjects(loadProjects());
  }

  return (
    <div className="w-72 shrink-0 bg-card border-r border-border flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold">Projetos salvos</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Novo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {projects.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Nenhum projeto salvo ainda.
            <br />Crie um novo para começar.
          </p>
        )}
        {projects.map((p) => {
          const template = STRATEGY_TEMPLATES.find((t) => t.id === p.templateId);
          return (
            <div
              key={p.id}
              className="group rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-accent transition-all cursor-pointer p-3"
              onClick={() => onLoad(p)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {template && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: template.color }}
                      >
                        {template.name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(p.savedAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────────────────── */

interface ActiveProject {
  id: string;
  name: string;
  templateId: string;
  nodes: StrategyNode[];
  edges: StrategyEdge[];
}

export default function EstrategiaPage() {
  const [showSetup, setShowSetup] = useState(false);
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  function handleStart({ name, template }: { name: string; template: StrategyTemplate }) {
    // Clone nodes with the project name injected into root
    const nodes = template.nodes.map((n) =>
      n.data.subtype === "root"
        ? { ...n, data: { ...n.data, label: `${template.name}\n${name}` } }
        : { ...n }
    );
    setActiveProject({
      id: crypto.randomUUID(),
      name,
      templateId: template.id,
      nodes,
      edges: template.edges.map((e) => ({ ...e })),
    });
    setShowSetup(false);
  }

  function handleLoad(p: SavedProject) {
    setActiveProject({ id: p.id, name: p.name, templateId: p.templateId, nodes: p.nodes, edges: p.edges });
  }

  function handleSaved() {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  }

  return (
    <div
      className="flex overflow-hidden rounded-xl border border-border"
      style={{ height: "calc(100vh - 3.5rem - 2rem)" }}
    >
      {/* Sidebar panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <ProjectsPanel onLoad={handleLoad} onNew={() => setShowSetup(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Canvas topbar */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-border bg-card shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setShowPanel((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
              title={showPanel ? "Ocultar painel" : "Mostrar painel"}
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            {activeProject && (
              <>
                <div className="w-px h-4 bg-border" />
                <p className="text-xs font-medium truncate text-muted-foreground">
                  {activeProject.name}
                </p>
                {(() => {
                  const t = STRATEGY_TEMPLATES.find((t) => t.id === activeProject.templateId);
                  return t ? (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                      style={{ background: t.color }}
                    >
                      {t.name}
                    </span>
                  ) : null;
                })()}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {savedFeedback && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-emerald-400 font-medium"
              >
                ✓ Salvo!
              </motion.span>
            )}
            <button
              onClick={() => setShowSetup(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors text-muted-foreground"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Nova estratégia</span>
            </button>
          </div>
        </div>

        {/* Canvas or empty state */}
        <div className="flex-1 relative overflow-hidden">
          {activeProject ? (
            <ReactFlowProvider>
              <CanvasInner
                key={activeProject.id}
                initNodes={activeProject.nodes}
                initEdges={activeProject.edges}
                projectName={activeProject.name}
                projectId={activeProject.id}
                templateId={activeProject.templateId}
                onSaved={handleSaved}
              />
            </ReactFlowProvider>
          ) : (
            <EmptyCanvas onNew={() => setShowSetup(true)} />
          )}
        </div>
      </div>

      {/* Setup modal */}
      <AnimatePresence>
        {showSetup && <SetupModal onStart={handleStart} />}
      </AnimatePresence>
    </div>
  );
}

/* ─── empty canvas ────────────────────────────────────────────────────────── */

function EmptyCanvas({ onNew }: { onNew: () => void }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-5 select-none"
      style={{ background: "#080B14" }}
    >
      {/* Decorative grid dots */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#1E293B" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <LayoutTemplate className="w-9 h-9 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Nenhuma estratégia ativa</h3>
          <p className="text-sm text-white/40 max-w-xs">
            Escolha um dos 8 templates de estratégia de tráfego pago ou carregue um projeto salvo.
          </p>
        </div>

        <button
          onClick={onNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Criar nova estratégia
        </button>

        {/* Platform badges preview */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {Object.entries(PLATFORMS).map(([k, v]) => (
            <PlatformBadge key={k} platform={k} size="md" />
          ))}
        </div>
        <p className="text-[10px] text-white/25">
          Meta · Google · YouTube · LinkedIn · Pinterest · TikTok · Twitter · GA4
        </p>
      </div>
    </div>
  );
}
