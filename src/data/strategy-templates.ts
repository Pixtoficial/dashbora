import { type Node, type Edge, MarkerType } from "@xyflow/react";

export type NodeSubtype =
  | "root"
  | "platform"
  | "phase"
  | "campaign"
  | "audience"
  | "creative"
  | "metric"
  | "funnel";

export interface StrategyNodeData extends Record<string, unknown> {
  label: string;
  subtype: NodeSubtype;
  description?: string;
  platform?: string;
}

export type StrategyNode = Node<StrategyNodeData>;
export type StrategyEdge = Edge;

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  nodes: StrategyNode[];
  edges: StrategyEdge[];
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function n(
  id: string,
  label: string,
  subtype: NodeSubtype,
  x: number,
  y: number,
  extra: Partial<StrategyNodeData> = {}
): StrategyNode {
  return {
    id,
    type: "strategyNode",
    position: { x, y },
    data: { label, subtype, ...extra },
  };
}

function e(
  id: string,
  source: string,
  target: string,
  animated = false,
  dashed = false
): StrategyEdge {
  return {
    id,
    source,
    target,
    type: "smoothstep",
    animated,
    style: {
      stroke: dashed ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.6)",
      strokeWidth: 1.5,
      strokeDasharray: dashed ? "6 4" : undefined,
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(99,102,241,0.6)", width: 14, height: 14 },
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TEMPLATE 1 — LANÇAMENTO                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
export const templateLancamento: StrategyTemplate = {
  id: "lancamento",
  name: "Lançamento",
  description: "Funil PLR completo: pré-lançamento, carrinho aberto e recuperação",
  color: "#8B5CF6",
  nodes: [
    n("root", "Lançamento", "root", 480, 360),

    // Fases
    n("phase-pre", "Pré-Lançamento", "phase", 100, 120, { description: "4–8 semanas antes\nAquecimento e lista" }),
    n("phase-open", "Abertura do Carrinho", "phase", 480, 60, { description: "7–14 dias de oferta\nUrgência + escassez" }),
    n("phase-post", "Pós-Lançamento", "phase", 860, 120, { description: "72h após fechar\nRecuperação e downsell" }),

    // Plataformas
    n("plat-meta", "Meta Ads", "platform", 100, 360, { platform: "meta", description: "Principal · 70% do budget" }),
    n("plat-google", "Google Ads", "platform", 860, 360, { platform: "google", description: "Intenção · 20% do budget" }),
    n("plat-youtube", "YouTube Ads", "platform", 1000, 520, { platform: "youtube", description: "Awareness · 10% do budget" }),

    // Campanhas
    n("camp-aw", "Awareness\n& Conteúdo", "campaign", 0, 520, { description: "Vídeos educativos\nAlcance e visualizações" }),
    n("camp-leads", "Captação de Leads", "campaign", 200, 580, { description: "Lead magnet grátis\nMeta CPL: R$5–15" }),
    n("camp-conv", "Conversão", "campaign", 480, 600, { description: "Carrinho aberto\nProva social + urgência" }),
    n("camp-ret", "Retargeting", "campaign", 760, 560, { description: "Visitantes LP\nAbandonaram checkout" }),
    n("camp-search", "Search\n(Intenção de compra)", "campaign", 960, 360, { description: "Palavras-chave da marca\ne busca consciente" }),

    // Audiências
    n("aud-cold", "Público Frio", "audience", 60, 740, { description: "Lookalike 1–3%\nInteresses amplos" }),
    n("aud-warm", "Público Morno", "audience", 280, 760, { description: "Engajados 60d\nViews de vídeo 50%+" }),
    n("aud-hot", "Público Quente", "audience", 500, 780, { description: "Visitantes LP\nLista de e-mails" }),

    // KPIs
    n("kpi-cpl", "CPL: R$5–15", "metric", 100, 920, { description: "Custo por lead qualificado" }),
    n("kpi-roas", "ROAS: 3–5×", "metric", 480, 940, { description: "Retorno no período do lançamento" }),
    n("kpi-cpa", "CPA: 20–30%\ndo ticket", "metric", 820, 920, { description: "Custo por aquisição aceitável" }),
  ],
  edges: [
    e("e1", "phase-pre", "phase-open", true),
    e("e2", "phase-open", "phase-post", true),
    e("e3", "root", "phase-pre"),
    e("e4", "root", "phase-open"),
    e("e5", "root", "phase-post"),
    e("e6", "root", "plat-meta"),
    e("e7", "root", "plat-google"),
    e("e8", "plat-meta", "camp-aw"),
    e("e9", "plat-meta", "camp-leads"),
    e("e10", "plat-meta", "camp-conv"),
    e("e11", "plat-meta", "camp-ret"),
    e("e12", "plat-google", "camp-search"),
    e("e13", "plat-google", "camp-ret"),
    e("e14", "plat-youtube", "camp-aw"),
    e("e15", "plat-meta", "aud-cold", false, true),
    e("e16", "plat-meta", "aud-warm", false, true),
    e("e17", "plat-meta", "aud-hot", false, true),
    e("e18", "root", "kpi-cpl", false, true),
    e("e19", "root", "kpi-roas", false, true),
    e("e20", "root", "kpi-cpa", false, true),
  ],
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TEMPLATE 2 — INFOPRODUTO                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
export const templateInfoproduto: StrategyTemplate = {
  id: "infoproduto",
  name: "Infoproduto",
  description: "Funil evergreen para produto digital com VSL, upsell e email",
  color: "#06B6D4",
  nodes: [
    n("root", "Infoproduto\nEvergreen", "root", 480, 340),

    // Funil
    n("fun-top", "Topo: Tráfego Frio", "funnel", 160, 100, { description: "Primeiro contato\nEducar e qualificar" }),
    n("fun-mid", "Meio: Aquecimento", "funnel", 480, 80, { description: "Conteúdo de valor\nNurturing" }),
    n("fun-bot", "Fundo: Conversão", "funnel", 800, 100, { description: "Oferta direta\nCheckout otimizado" }),

    // Plataformas
    n("plat-meta", "Meta Ads", "platform", 100, 340, { platform: "meta", description: "VSL e remarketing" }),
    n("plat-yt", "YouTube Ads", "platform", 860, 340, { platform: "youtube", description: "Awareness e educação" }),
    n("plat-google", "Google Ads", "platform", 860, 500, { platform: "google", description: "Search intent" }),

    // Campanhas
    n("camp-vsl", "VSL\n(Vídeo de Vendas)", "campaign", 60, 500, { description: "3–10 min explicando\ndor, sonho e solução" }),
    n("camp-free", "Conteúdo Gratuito", "campaign", 260, 560, { description: "Aula grátis / PDF\nIsca digital" }),
    n("camp-checkout", "Campanha\nde Compra", "campaign", 480, 560, { description: "Objetivo: compra\nCriativo direto ao ponto" }),
    n("camp-upsell", "Upsell / Order Bump", "campaign", 700, 540, { description: "Oferta após compra\n30–50% de aproveitamento" }),
    n("camp-winback", "Win-Back", "campaign", 900, 400, { description: "Recuperar leads\nque não compraram" }),

    // Audiências
    n("aud-cold", "Públicos Frios", "audience", 80, 720, { description: "Lookalike compradores\nInteresses do nicho" }),
    n("aud-email", "Lista de E-mails", "audience", 340, 740, { description: "Leads capturados\nSegmentados por estágio" }),
    n("aud-buyers", "Compradores", "audience", 600, 740, { description: "Excluir de aquisição\nAtivação de upsell" }),

    // KPIs
    n("kpi-cac", "CAC: R$60–200", "metric", 120, 880, { description: "Custo de aquisição do cliente" }),
    n("kpi-ltv", "LTV: 3× CAC", "metric", 480, 900, { description: "Valor vitalício mínimo saudável" }),
    n("kpi-conv", "Conversão LP: 2–5%", "metric", 820, 880, { description: "Taxa da página de vendas" }),
  ],
  edges: [
    e("e1", "fun-top", "fun-mid", true),
    e("e2", "fun-mid", "fun-bot", true),
    e("e3", "root", "fun-top"),
    e("e4", "root", "fun-mid"),
    e("e5", "root", "fun-bot"),
    e("e6", "root", "plat-meta"),
    e("e7", "root", "plat-yt"),
    e("e8", "plat-meta", "camp-vsl"),
    e("e9", "plat-meta", "camp-free"),
    e("e10", "plat-meta", "camp-checkout"),
    e("e11", "plat-meta", "camp-upsell"),
    e("e12", "plat-google", "camp-winback"),
    e("e13", "plat-yt", "camp-vsl"),
    e("e14", "plat-meta", "aud-cold", false, true),
    e("e15", "plat-meta", "aud-email", false, true),
    e("e16", "camp-checkout", "aud-buyers", false, true),
    e("e17", "root", "kpi-cac", false, true),
    e("e18", "root", "kpi-ltv", false, true),
    e("e19", "root", "kpi-conv", false, true),
  ],
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TEMPLATE 3 — WEBINAR                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
export const templateWebinar: StrategyTemplate = {
  id: "webinar",
  name: "Webinar",
  description: "Funil de webinar ao vivo com inscrição, replay e fechamento de oferta",
  color: "#F59E0B",
  nodes: [
    n("root", "Webinar\nFunil", "root", 480, 340),

    // Fases cronológicas
    n("ph-reg", "1. Inscrição", "phase", 60, 100, { description: "Campanha de inscrição\n7–14 dias antes" }),
    n("ph-pre", "2. Pré-evento", "phase", 260, 60, { description: "Sequência de lembretes\nAquecimento da audiência" }),
    n("ph-live", "3. Ao Vivo", "phase", 480, 40, { description: "Evento + pitch de vendas\nUrgência real" }),
    n("ph-replay", "4. Replay", "phase", 700, 60, { description: "24–48h de replay\nSegunda chance de compra" }),
    n("ph-close", "5. Fechamento", "phase", 900, 100, { description: "Carrinho fecha\nÚltimas chamadas" }),

    // Plataformas
    n("plat-meta", "Meta Ads", "platform", 100, 340, { platform: "meta", description: "Principal · inscrições" }),
    n("plat-google", "Google Ads", "platform", 860, 340, { platform: "google", description: "Search de interesse" }),

    // Campanhas
    n("camp-inscr", "Campanha de\nInscrição", "campaign", 60, 520, { description: "Objetivo: Lead\nLP de registro" }),
    n("camp-rem", "Lembretes\n(E-mail + Anúncio)", "campaign", 260, 580, { description: "Dia anterior + 1h antes\nMaximizar presença" }),
    n("camp-conv", "Conversão\nPós-Webinar", "campaign", 500, 580, { description: "Somente para quem assistiu\nMeta ROAS 2–4×" }),
    n("camp-nshow", "No-Show\nRemarketing", "campaign", 720, 540, { description: "Quem inscreveu mas\nnão apareceu → replay" }),

    // KPIs
    n("kpi-cpr", "CPR: R$5–20", "metric", 100, 760, { description: "Custo por registro" }),
    n("kpi-show", "Show Rate: 30–50%", "metric", 380, 780, { description: "% de inscritos que aparecem" }),
    n("kpi-close", "Close Rate: 5–15%", "metric", 660, 760, { description: "% presentes que compram" }),
    n("kpi-rev", "ROI mínimo: 3×", "metric", 900, 760, { description: "Retorno sobre investimento" }),
  ],
  edges: [
    e("e1", "ph-reg", "ph-pre", true),
    e("e2", "ph-pre", "ph-live", true),
    e("e3", "ph-live", "ph-replay", true),
    e("e4", "ph-replay", "ph-close", true),
    e("e5", "root", "ph-reg"),
    e("e6", "root", "ph-pre"),
    e("e7", "root", "ph-live"),
    e("e8", "root", "ph-replay"),
    e("e9", "root", "ph-close"),
    e("e10", "root", "plat-meta"),
    e("e11", "root", "plat-google"),
    e("e12", "plat-meta", "camp-inscr"),
    e("e13", "plat-meta", "camp-rem"),
    e("e14", "plat-meta", "camp-conv"),
    e("e15", "plat-meta", "camp-nshow"),
    e("e16", "plat-google", "camp-inscr"),
    e("e17", "root", "kpi-cpr", false, true),
    e("e18", "root", "kpi-show", false, true),
    e("e19", "root", "kpi-close", false, true),
    e("e20", "root", "kpi-rev", false, true),
  ],
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TEMPLATE 4 — PERPÉTUO                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
export const templatePerpetuo: StrategyTemplate = {
  id: "perpetuo",
  name: "Perpétuo",
  description: "Funil evergreen always-on com escalonamento automático e regras de otimização",
  color: "#10B981",
  nodes: [
    n("root", "Funil Perpétuo\nEvergreen", "root", 480, 340),

    n("plat-meta", "Meta Advantage+", "platform", 100, 200, { platform: "meta", description: "Campanha Shopping+\nAutomação de audiência" }),
    n("plat-google", "Google PMAX", "platform", 860, 200, { platform: "google", description: "Performance Max\nTodos canais do Google" }),
    n("plat-yt", "YouTube Ads", "platform", 1000, 400, { platform: "youtube", description: "Awareness permanente" }),

    n("fun-top", "Atração\n(sempre ativo)", "funnel", 160, 100, { description: "Novos públicos frios\nConteúdo/Lead magnet" }),
    n("fun-mid", "Nutrição", "funnel", 480, 80, { description: "E-mail automation\nRetargeting sequencial" }),
    n("fun-bot", "Conversão", "funnel", 800, 100, { description: "Oferta principal\n+ upsells automáticos" }),

    n("camp-cold", "Aquisição\nPúblico Frio", "campaign", 80, 440, { description: "Lookalike dinâmico\nInteresses amplos" }),
    n("camp-warm", "Retargeting\n3–14 dias", "campaign", 280, 520, { description: "Visitantes recentes\nEngajados recentes" }),
    n("camp-hot", "Carrinho /\nCheckout", "campaign", 500, 560, { description: "Abandono de carrinho\nMáx. urgência" }),
    n("camp-ltv", "Upsell Compradores", "campaign", 720, 500, { description: "Cross-sell e upsell\nAumentar LTV" }),
    n("camp-excl", "Exclusões de\nCompradores", "campaign", 920, 360, { description: "Nunca anunciar\no mesmo produto 2×" }),

    n("rule-scale", "Regra: Escalar", "creative", 140, 700, { description: "ROAS > meta por 3 dias\n→ +20% budget" }),
    n("rule-cut", "Regra: Cortar", "creative", 380, 720, { description: "ROAS < 1 por 2 dias\n→ pausar ad set" }),

    n("kpi-roas", "ROAS meta: 3–8×", "metric", 120, 880, { description: "Varia por nicho" }),
    n("kpi-freq", "Frequência: ≤2.5", "metric", 480, 900, { description: "Controle de saturação" }),
    n("kpi-cac", "CAC estável MoM", "metric", 840, 880, { description: "Sem crescimento de CAC" }),
  ],
  edges: [
    e("e1", "fun-top", "fun-mid", true),
    e("e2", "fun-mid", "fun-bot", true),
    e("e3", "root", "plat-meta"),
    e("e4", "root", "plat-google"),
    e("e5", "root", "fun-top"),
    e("e6", "root", "fun-mid"),
    e("e7", "root", "fun-bot"),
    e("e8", "plat-meta", "camp-cold"),
    e("e9", "plat-meta", "camp-warm"),
    e("e10", "plat-meta", "camp-hot"),
    e("e11", "plat-meta", "camp-ltv"),
    e("e12", "plat-google", "camp-excl"),
    e("e13", "plat-yt", "camp-cold"),
    e("e14", "root", "rule-scale", false, true),
    e("e15", "root", "rule-cut", false, true),
    e("e16", "root", "kpi-roas", false, true),
    e("e17", "root", "kpi-freq", false, true),
    e("e18", "root", "kpi-cac", false, true),
  ],
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TEMPLATE 5 — LEADS                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
export const templateLeads: StrategyTemplate = {
  id: "leads",
  name: "Geração de Leads",
  description: "Funil de captação de leads com isca digital, qualificação e handoff para vendas",
  color: "#3B82F6",
  nodes: [
    n("root", "Geração\nde Leads", "root", 480, 340),

    n("plat-meta", "Meta Ads", "platform", 100, 240, { platform: "meta", description: "Lead Gen Forms\n+ Landing Page" }),
    n("plat-google", "Google Ads", "platform", 860, 240, { platform: "google", description: "Search de alta intenção" }),
    n("plat-linkedin", "LinkedIn Ads", "platform", 980, 420, { platform: "linkedin", description: "B2C premium / B2B leve" }),

    n("camp-magnet", "Isca Digital\n(Lead Magnet)", "campaign", 60, 440, { description: "E-book, planilha,\nmini-curso, quiz" }),
    n("camp-form", "Lead Gen Form\n(Nativo)", "campaign", 260, 520, { description: "Formulário dentro\ndo Facebook/Instagram" }),
    n("camp-lp", "Landing Page\n(Site Próprio)", "campaign", 480, 560, { description: "Maior qualificação\nIntegrar com CRM" }),
    n("camp-qual", "Qualificação\nde Leads", "campaign", 700, 520, { description: "Perguntas de qualificação\nLeads quentes → SDR" }),
    n("camp-search", "Search Ads\n(Bottom Funnel)", "campaign", 920, 340, { description: "\"[nicho] + contratar\"\n\"melhor [solução]\"" }),

    n("aud-ica", "ICP Definido", "audience", 80, 720, { description: "Perfil do cliente ideal\nDetalhado e testado" }),
    n("aud-excl", "Exclusão:\nJá clientes", "audience", 320, 740, { description: "Não gastar com\nquem já comprou" }),
    n("aud-sim", "Lookalike de\nLeads Qualificados", "audience", 580, 740, { description: "LAL de MQLs\n1–5% para começar" }),

    n("kpi-cpl", "CPL: R$10–50", "metric", 100, 900, { description: "Varia muito por nicho" }),
    n("kpi-qual", "Taxa Qualificação:\n20–40%", "metric", 460, 920, { description: "Leads que viram MQL" }),
    n("kpi-close", "Close Rate SDR:\n15–30%", "metric", 820, 900, { description: "MQL → cliente" }),
  ],
  edges: [
    e("e1", "root", "plat-meta"),
    e("e2", "root", "plat-google"),
    e("e3", "plat-meta", "camp-magnet"),
    e("e4", "plat-meta", "camp-form"),
    e("e5", "plat-meta", "camp-lp"),
    e("e6", "plat-meta", "camp-qual"),
    e("e7", "plat-google", "camp-search"),
    e("e8", "plat-google", "camp-lp"),
    e("e9", "plat-linkedin", "camp-form"),
    e("e10", "camp-form", "camp-qual", true),
    e("e11", "camp-lp", "camp-qual", true),
    e("e12", "root", "aud-ica", false, true),
    e("e13", "root", "aud-excl", false, true),
    e("e14", "root", "aud-sim", false, true),
    e("e15", "root", "kpi-cpl", false, true),
    e("e16", "root", "kpi-qual", false, true),
    e("e17", "root", "kpi-close", false, true),
  ],
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TEMPLATE 6 — B2B                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */
export const templateB2B: StrategyTemplate = {
  id: "b2b",
  name: "B2B",
  description: "Estratégia B2B com LinkedIn como canal principal, ABM e ciclo de vendas longo",
  color: "#0A66C2",
  nodes: [
    n("root", "Estratégia B2B", "root", 480, 340),

    n("plat-linkedin", "LinkedIn Ads", "platform", 80, 240, { platform: "linkedin", description: "Canal principal B2B\nDecisores e gestores" }),
    n("plat-google", "Google Ads", "platform", 880, 240, { platform: "google", description: "Search de marca\ne de concorrentes" }),
    n("plat-meta", "Meta Ads", "platform", 880, 420, { platform: "meta", description: "Retargeting\n+ awareness secundário" }),

    n("camp-thought", "Thought Leadership\n(Conteúdo)", "campaign", 60, 440, { description: "Artigos, cases, dados\nPosicionamento de autoridade" }),
    n("camp-demo", "Oferta de\nDemo / Trial", "campaign", 260, 520, { description: "\"Agende uma demo\"\nFormulário simplificado" }),
    n("camp-abm", "Account-Based\nMarketing (ABM)", "campaign", 480, 560, { description: "Empresas-alvo específicas\nPersonalização máxima" }),
    n("camp-search", "Search Brand +\nConcorrentes", "campaign", 780, 500, { description: "Capturar quem\nbusca soluções" }),
    n("camp-retarg", "Retargeting\nMulti-toque", "campaign", 960, 380, { description: "7–30+ touchpoints\naté decisão de compra" }),

    n("aud-dec", "Decisores", "audience", 60, 720, { description: "C-Level, VP, Diretores\nCargo + setor + empresa" }),
    n("aud-inf", "Influenciadores", "audience", 300, 740, { description: "Gerentes e coordenadores\nque indicam para o chefe" }),
    n("aud-comp", "Clientes dos\nConcorrentes", "audience", 560, 740, { description: "LinkedIn: seguem\npage do concorrente" }),

    n("kpi-cpl", "CPL: R$80–300", "metric", 100, 900, { description: "Lead B2B é caro\nmas converte melhor" }),
    n("kpi-cycle", "Ciclo de Vendas:\n30–180 dias", "metric", 460, 920, { description: "Nutrir durante todo\no processo" }),
    n("kpi-deal", "Deal Size: 5–50×\ndo CPL", "metric", 820, 900, { description: "LTV justifica\no custo de aquisição" }),
  ],
  edges: [
    e("e1", "root", "plat-linkedin"),
    e("e2", "root", "plat-google"),
    e("e3", "root", "plat-meta"),
    e("e4", "plat-linkedin", "camp-thought"),
    e("e5", "plat-linkedin", "camp-demo"),
    e("e6", "plat-linkedin", "camp-abm"),
    e("e7", "plat-google", "camp-search"),
    e("e8", "plat-meta", "camp-retarg"),
    e("e9", "camp-demo", "camp-abm", true),
    e("e10", "root", "aud-dec", false, true),
    e("e11", "root", "aud-inf", false, true),
    e("e12", "root", "aud-comp", false, true),
    e("e13", "root", "kpi-cpl", false, true),
    e("e14", "root", "kpi-cycle", false, true),
    e("e15", "root", "kpi-deal", false, true),
  ],
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TEMPLATE 7 — RECONHECIMENTO                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
export const templateReconhecimento: StrategyTemplate = {
  id: "reconhecimento",
  name: "Reconhecimento",
  description: "Estratégia de brand awareness com vídeo, alcance e frequência controlada",
  color: "#EC4899",
  nodes: [
    n("root", "Reconhecimento\nde Marca", "root", 480, 320),

    n("plat-meta", "Meta Ads", "platform", 100, 200, { platform: "meta", description: "Reels, Stories e Feed\nAlcance + Frequência" }),
    n("plat-yt", "YouTube Ads", "platform", 860, 200, { platform: "youtube", description: "Pre-roll e Bumper\nAlta retenção" }),
    n("plat-tiktok", "TikTok Ads", "platform", 100, 460, { platform: "tiktok", description: "18–35 anos\nAlto alcance orgânico" }),
    n("plat-pin", "Pinterest Ads", "platform", 860, 460, { platform: "pinterest", description: "Interesse e descoberta\nNichos visuais" }),

    n("camp-video", "Campanha\nde Vídeo Views", "campaign", 60, 340, { description: "Vídeo 15–60s\nMeta: CPV < R$0,10" }),
    n("camp-reach", "Campanha\nde Alcance", "campaign", 280, 400, { description: "Maior alcance único\nControle de frequência" }),
    n("camp-eng", "Engajamento\nde Página", "campaign", 500, 440, { description: "Curtidas, comentários\nProva social massiva" }),
    n("camp-story", "Stories e Reels\nBranded", "campaign", 720, 400, { description: "Formato nativo\nAlta taxa de conclusão" }),

    n("creat-v15", "Vídeo 15s\n(Hook forte)", "creative", 80, 620, { description: "Primeiros 3s capturam\n80% da atenção" }),
    n("creat-v60", "Vídeo 60s\n(Storytelling)", "creative", 320, 640, { description: "Contar história\nda marca/produto" }),
    n("creat-img", "Imagens\nde Alto Impacto", "creative", 580, 640, { description: "Contraste, rostos,\nnúmeros grandes" }),

    n("kpi-cpm", "CPM: R$5–20", "metric", 120, 820, { description: "Custo por mil impressões" }),
    n("kpi-freq", "Frequência: 3–7×", "metric", 480, 840, { description: "Construir memória de marca" }),
    n("kpi-recall", "Brand Recall:\n+20–40%", "metric", 840, 820, { description: "Medição via pesquisa" }),
  ],
  edges: [
    e("e1", "root", "plat-meta"),
    e("e2", "root", "plat-yt"),
    e("e3", "root", "plat-tiktok"),
    e("e4", "root", "plat-pin"),
    e("e5", "plat-meta", "camp-video"),
    e("e6", "plat-meta", "camp-reach"),
    e("e7", "plat-meta", "camp-eng"),
    e("e8", "plat-meta", "camp-story"),
    e("e9", "plat-yt", "camp-video"),
    e("e10", "plat-tiktok", "camp-video"),
    e("e11", "camp-video", "creat-v15"),
    e("e12", "camp-video", "creat-v60"),
    e("e13", "camp-reach", "creat-img"),
    e("e14", "root", "kpi-cpm", false, true),
    e("e15", "root", "kpi-freq", false, true),
    e("e16", "root", "kpi-recall", false, true),
  ],
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TEMPLATE 8 — E-COMMERCE                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
export const templateEcommerce: StrategyTemplate = {
  id: "ecommerce",
  name: "E-commerce",
  description: "Funil para loja virtual com catálogo dinâmico, remarketing e recuperação de carrinho",
  color: "#F97316",
  nodes: [
    n("root", "E-commerce\nLoja Virtual", "root", 480, 340),

    n("plat-meta", "Meta Catalog Ads", "platform", 100, 200, { platform: "meta", description: "Catálogo dinâmico\nAdvantage+ Shopping" }),
    n("plat-google", "Google Shopping", "platform", 860, 200, { platform: "google", description: "Shopping + PMAX\nAlta intenção de compra" }),
    n("plat-pin", "Pinterest Shopping", "platform", 860, 440, { platform: "pinterest", description: "Descoberta visual\nNichos de moda/casa/decor" }),

    n("camp-dpa", "Dynamic Product\nAds (DPA)", "campaign", 60, 380, { description: "Produtos do catálogo\nAutomaticamente personalizados" }),
    n("camp-prosp", "Prospecção\nNovos Clientes", "campaign", 260, 460, { description: "Lookalike de compradores\nInteresses do produto" }),
    n("camp-cart", "Recuperação\nde Carrinho", "campaign", 480, 520, { description: "Abandonaram o checkout\nMáxima urgência" }),
    n("camp-cross", "Cross-sell /\nUpsell", "campaign", 700, 460, { description: "Complementar à compra\nJanela de 7–30 dias" }),
    n("camp-shop", "Google Shopping\n& PMAX", "campaign", 940, 320, { description: "Captura quem pesquisa\nprodutos similares" }),

    n("aud-cold", "Novos Compradores\nPotenciais", "audience", 80, 680, { description: "Lookalike 1–3%\nde compradores reais" }),
    n("aud-visitors", "Visitantes da\nLoja (3–30d)", "audience", 340, 700, { description: "Visualizaram produto\nmas não compraram" }),
    n("aud-buyers", "Compradores\nAtuais", "audience", 620, 700, { description: "LTV: Cross-sell\nNão recomprar o mesmo" }),

    n("kpi-roas", "ROAS: 3–10×", "metric", 100, 880, { description: "Varia por margem do produto" }),
    n("kpi-cart", "Recuperação: 15–25%", "metric", 460, 900, { description: "% carrinhos recuperados" }),
    n("kpi-aov", "AOV acima de\n2× CPC médio", "metric", 820, 880, { description: "Ticket médio saudável" }),
  ],
  edges: [
    e("e1", "root", "plat-meta"),
    e("e2", "root", "plat-google"),
    e("e3", "root", "plat-pin"),
    e("e4", "plat-meta", "camp-dpa"),
    e("e5", "plat-meta", "camp-prosp"),
    e("e6", "plat-meta", "camp-cart"),
    e("e7", "plat-meta", "camp-cross"),
    e("e8", "plat-google", "camp-shop"),
    e("e9", "plat-google", "camp-cart"),
    e("e10", "camp-prosp", "camp-cart", true),
    e("e11", "camp-cart", "camp-cross", true),
    e("e12", "root", "aud-cold", false, true),
    e("e13", "root", "aud-visitors", false, true),
    e("e14", "root", "aud-buyers", false, true),
    e("e15", "root", "kpi-roas", false, true),
    e("e16", "root", "kpi-cart", false, true),
    e("e17", "root", "kpi-aov", false, true),
  ],
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  REGISTRY                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  templateLancamento,
  templateInfoproduto,
  templateWebinar,
  templatePerpetuo,
  templateLeads,
  templateB2B,
  templateReconhecimento,
  templateEcommerce,
];
