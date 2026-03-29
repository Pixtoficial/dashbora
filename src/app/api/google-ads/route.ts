/**
 * GET /api/google-ads?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&customerId=xxx
 *
 * Retorna métricas diárias do Google Ads agregadas por data.
 * Em modo mock (NEXT_PUBLIC_DATA_MODE=mock ou credenciais ausentes),
 * retorna dados simulados para desenvolvimento sem credenciais reais.
 */

import { NextRequest, NextResponse } from "next/server";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { fetchGoogleAdsDaily, aggregateGadsByDate, fetchGoogleAdsCampaigns, GadsRawRow } from "@/lib/google-ads-client";
import { seededRandom } from "@/lib/utils";

// ─── Mock data generator ──────────────────────────────────────────────────────

function generateMockGadsData(startDate: string, endDate: string, userId: string): GadsRawRow[] {
  const isUserOne = userId.includes("1") || userId === "user-1";
  const baseImpressions = isUserOne ? 80_000 : 22_000;
  const baseCostMicros = isUserOne ? 1_510_000_000 : 400_000_000; // micros por 30d
  const rand = seededRandom(userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0));

  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

  return days.map((day) => {
    const factor = 0.7 + rand() * 0.6;
    const impressions = Math.round((baseImpressions / 30) * factor);
    const clicks = Math.round(impressions * (0.015 + rand() * 0.02));
    const costMicros = Math.round((baseCostMicros / 30) * factor);
    const activeViewImpressions = Math.round(impressions * (0.75 + rand() * 0.15));

    return {
      segmentsDate: format(day, "yyyy-MM-dd"),
      campaignName: "mock_campaign",
      costMicros,
      impressions,
      clicks,
      ctr: impressions > 0 ? clicks / impressions : 0,
      averageCpm: impressions > 0 ? (costMicros / impressions) * 1000 : 0,
      averageCpc: clicks > 0 ? costMicros / clicks : 0,
      activeViewImpressions,
      allConversions: Math.round(clicks * (0.02 + rand() * 0.03)),
      allConversionsValue: 0,
      conversions: Math.round(clicks * (0.02 + rand() * 0.025)),
      conversionsValue: 0,
    };
  });
}

// ─── Mock campaign generator ──────────────────────────────────────────────────

function generateMockCampaigns(startDate: string, endDate: string) {
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).length;
  const f = days / 30;
  const rand = seededRandom(99);
  const BASE_COST_MICROS = 28_500_000_000; // R$ 28.500 in micros

  const campaigns = [
    { id: "c1", name: "Brand | Termos Principais",      channelType: "SEARCH",          share: 0.22 },
    { id: "c2", name: "Não-Brand | Categoria",           channelType: "SEARCH",          share: 0.18 },
    { id: "c3", name: "PMax | Toda Base",                channelType: "PERFORMANCE_MAX", share: 0.32 },
    { id: "c4", name: "Demand Gen | Prospecção",         channelType: "DEMAND_GEN",      share: 0.15 },
    { id: "c5", name: "Remarketing | Visitantes 30d",    channelType: "DISPLAY",         share: 0.09 },
    { id: "c6", name: "YouTube | Awareness Topo",        channelType: "VIDEO",           share: 0.04 },
  ];

  return campaigns.map((c) => {
    const costMicros = Math.round(BASE_COST_MICROS * f * c.share * (0.85 + rand() * 0.3));
    const impressions = Math.round((1_100_000 / 5) * f * (0.7 + rand() * 0.6));
    const clicks = Math.round(impressions * (0.015 + rand() * 0.025));
    const conversions = Math.round(clicks * (0.02 + rand() * 0.03));
    return {
      campaignId: c.id,
      campaignName: c.name,
      channelType: c.channelType,
      costMicros,
      impressions,
      clicks,
      conversions,
      conversionsValue: conversions * (80 + rand() * 40) * 1_000_000,
    };
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const report = searchParams.get("report") ?? "daily";
    const customerId = searchParams.get("customerId") ?? undefined;
    const userId = searchParams.get("userId") ?? "user-1";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate e endDate são obrigatórios (formato YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const useMock =
      process.env.NEXT_PUBLIC_DATA_MODE === "mock" ||
      !process.env.GOOGLE_ADS_DEVELOPER_TOKEN ||
      !process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (report === "campaigns") {
      const data = useMock
        ? generateMockCampaigns(startDate, endDate)
        : await fetchGoogleAdsCampaigns(startDate, endDate, customerId);
      return NextResponse.json({ data, source: useMock ? "mock" : "google_ads" });
    }

    // report === "daily" (default)
    let rows: GadsRawRow[];
    if (useMock) {
      rows = generateMockGadsData(startDate, endDate, userId);
    } else {
      rows = await fetchGoogleAdsDaily(startDate, endDate, customerId);
    }

    const aggregated = aggregateGadsByDate(rows);

    const data = Array.from(aggregated.entries()).map(([date, row]) => ({
      date,
      ...row,
      cost: row.costMicros / 1_000_000,
      averageCpmBrl: row.averageCpm / 1_000_000,
      averageCpcBrl: row.averageCpc / 1_000_000,
    }));

    return NextResponse.json({ data, source: useMock ? "mock" : "google_ads" });
  } catch (error: any) {
    console.error("[API /google-ads]", error);
    return NextResponse.json(
      { error: error?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}
