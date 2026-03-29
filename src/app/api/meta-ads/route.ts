/**
 * GET /api/meta-ads?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&report=insights|campaigns|daily
 *
 * Retorna dados do Meta Ads via Marketing API.
 * Em modo mock (META_ACCESS_TOKEN ausente), retorna dados simulados.
 */

import { NextRequest, NextResponse } from "next/server";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import {
  fetchMetaInsights,
  fetchMetaCampaignInsights,
  fetchMetaDailyInsights,
  MetaInsightsRow,
  MetaCampaignInsightRow,
  MetaDailyInsightRow,
} from "@/lib/meta-ads-client";
import { seededRandom } from "@/lib/utils";

// ─── Mock data generators ─────────────────────────────────────────────────────

const MOCK_BASE = {
  spend: 45_230,
  impressions: 2_400_000,
  clicks: 48_000,
  purchases: 1_250,
  purchaseValue: 189_966,
  leads: 380,
};

function scaleMock(base: number, days: number): number {
  return base * (days / 30);
}

function mockInsights(startDate: string, endDate: string): MetaInsightsRow {
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).length;
  const spend = scaleMock(MOCK_BASE.spend, days);
  const impressions = scaleMock(MOCK_BASE.impressions, days);
  const clicks = scaleMock(MOCK_BASE.clicks, days);
  const purchases = scaleMock(MOCK_BASE.purchases, days);
  const purchaseValue = scaleMock(MOCK_BASE.purchaseValue, days);
  const leads = scaleMock(MOCK_BASE.leads, days);

  return {
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    reach: Math.round(impressions * 0.72),
    purchases,
    purchaseValue,
    leads,
  };
}

function mockCampaigns(startDate: string, endDate: string): MetaCampaignInsightRow[] {
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).length;
  const rand = seededRandom(77);

  const names = [
    "Conversão — Black Friday",
    "Remarketing — Visitantes 30d",
    "Topo de Funil — Lookalike 3%",
    "Catálogo — Produtos em Alta",
    "Branding — Vídeo Views",
    "Lead Gen — Formulário",
    "Conversão — Checkout Abandono",
  ];

  return names.map((name, i) => {
    const weight = (1 / (i + 1));
    const totalWeight = names.reduce((s, _, j) => s + 1 / (j + 1), 0);
    const share = weight / totalWeight;

    const spend = scaleMock(MOCK_BASE.spend, days) * share * (0.7 + rand() * 0.6);
    const impressions = scaleMock(MOCK_BASE.impressions, days) * share * (0.7 + rand() * 0.6);
    const clicks = impressions * (0.015 + rand() * 0.025);
    const purchases = scaleMock(MOCK_BASE.purchases, days) * share * (0.6 + rand() * 0.8);
    const purchaseValue = spend * (2.5 + rand() * 3);

    return {
      id: `mock-camp-${i}`,
      name,
      spend,
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      purchases,
      purchaseValue,
    };
  });
}

function mockDaily(startDate: string, endDate: string): MetaDailyInsightRow[] {
  const rand = seededRandom(42);
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  const totalDays = days.length;

  return days.map((day) => {
    const f = 0.7 + rand() * 0.6;
    return {
      date: format(day, "yyyy-MM-dd"),
      spend: (MOCK_BASE.spend / totalDays) * f,
      revenue: (MOCK_BASE.purchaseValue / totalDays) * f,
    };
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const report = searchParams.get("report") ?? "insights";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate e endDate são obrigatórios" },
        { status: 400 }
      );
    }

    const useMock =
      process.env.NEXT_PUBLIC_DATA_MODE === "mock" ||
      !process.env.META_ACCESS_TOKEN ||
      !process.env.META_AD_ACCOUNT_ID;

    let data: unknown;

    if (report === "insights") {
      data = useMock
        ? mockInsights(startDate, endDate)
        : await fetchMetaInsights(startDate, endDate);
    } else if (report === "campaigns") {
      data = useMock
        ? mockCampaigns(startDate, endDate)
        : await fetchMetaCampaignInsights(startDate, endDate);
    } else if (report === "daily") {
      data = useMock
        ? mockDaily(startDate, endDate)
        : await fetchMetaDailyInsights(startDate, endDate);
    } else {
      return NextResponse.json({ error: `report "${report}" inválido` }, { status: 400 });
    }

    return NextResponse.json({ data, source: useMock ? "mock" : "meta_ads" });
  } catch (error: any) {
    console.error("[API /meta-ads]", error);
    return NextResponse.json(
      { error: error?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}
