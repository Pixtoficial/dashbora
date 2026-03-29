/**
 * GET /api/ga4?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&report=daily|pages|users
 *
 * Retorna dados do Google Analytics 4 via Data API.
 * Em modo mock, retorna dados simulados.
 */

import { NextRequest, NextResponse } from "next/server";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import {
  fetchGA4DailyMetrics,
  fetchGA4TopPages,
  fetchGA4UsersSummary,
  fetchGA4SessionsByChannel,
  fetchGA4DeviceBreakdown,
  GA4DayRow,
  GA4PageRow,
} from "@/lib/ga4-client";
import { seededRandom } from "@/lib/utils";

// ─── Mock generators ──────────────────────────────────────────────────────────

function mockDailyMetrics(startDate: string, endDate: string, userId: string): GA4DayRow[] {
  const isUserOne = userId === "user-1";
  const basePageViews = isUserOne ? 6_000 : 0;
  const baseLeads = isUserOne ? 74 : 0;
  const baseAddToCart = isUserOne ? 450 : 0;
  const baseCheckout = isUserOne ? 220 : 0;
  const basePurchases = isUserOne ? 85 : 0;
  const baseRevenue = isUserOne ? 10_400 : 0;

  const rand = seededRandom(userId.split("").reduce((a, c) => a + c.charCodeAt(0), 77));
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

  return days.map((day) => {
    const f = 0.65 + rand() * 0.7;
    const pageViews = Math.round((basePageViews / 30) * f);
    const leads = Math.round((baseLeads / 30) * f);
    const addToCart = Math.round((baseAddToCart / 30) * f);
    const checkout = Math.round((baseCheckout / 30) * f);
    const purchases = Math.round((basePurchases / 30) * f);
    const revenue = (baseRevenue / 30) * f;

    return {
      date: format(day, "yyyy-MM-dd"),
      pageViews,
      sessions: Math.round(pageViews * (0.55 + rand() * 0.2)),
      activeUsers: Math.round(pageViews * (0.45 + rand() * 0.2)),
      newUsers: Math.round(pageViews * (0.25 + rand() * 0.15)),
      engagementRate: 0.55 + rand() * 0.25,
      generateLead: leads,
      addToCart,
      beginCheckout: checkout,
      purchase: purchases,
      purchaseRevenue: revenue,
    };
  });
}

function mockTopPages(userId: string): GA4PageRow[] {
  if (userId !== "user-1") return [];
  const pages = [
    { pagePath: "/", pageTitle: "Home — Agência Premium" },
    { pagePath: "/produtos", pageTitle: "Catálogo de Produtos" },
    { pagePath: "/produto/tenis-corrida", pageTitle: "Tênis de Corrida Pro" },
    { pagePath: "/contato", pageTitle: "Fale Conosco" },
    { pagePath: "/sobre", pageTitle: "Sobre Nós" },
    { pagePath: "/blog", pageTitle: "Blog de Dicas" },
    { pagePath: "/checkout", pageTitle: "Finalizar Compra" },
    { pagePath: "/obrigado", pageTitle: "Pedido Confirmado" },
    { pagePath: "/produto/camiseta-premium", pageTitle: "Camiseta Premium" },
    { pagePath: "/categoria/esportes", pageTitle: "Esportes" },
  ];
  return pages.map((p, i) => ({
    ...p,
    screenPageViews: Math.round(8000 * Math.exp(-i * 0.35)),
    sessions: Math.round(5200 * Math.exp(-i * 0.35)),
    engagementRate: 0.45 + (Math.random() * 0.3),
  }));
}

function mockUsersSummary(startDate: string, endDate: string, userId: string) {
  if (userId !== "user-1") return [];
  const rand = seededRandom(42);
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  return days.map((day) => ({
    date: format(day, "yyyy-MM-dd"),
    activeUsers: Math.round(3800 * (0.7 + rand() * 0.6)),
    newUsers: Math.round(1200 * (0.6 + rand() * 0.8)),
  }));
}

function mockSessionsBySource() {
  return [
    { channelGroup: "Paid Search",    sessions: 68_400 },
    { channelGroup: "Paid Social",    sessions: 42_300 },
    { channelGroup: "Organic Search", sessions: 35_800 },
    { channelGroup: "Direct",         sessions: 18_200 },
    { channelGroup: "Email",          sessions:  9_600 },
    { channelGroup: "Referral",       sessions:  7_700 },
  ];
}

function mockDeviceBreakdown() {
  return [
    { deviceCategory: "mobile",  sessions: 123_760 },
    { deviceCategory: "desktop", sessions:  47_320 },
    { deviceCategory: "tablet",  sessions:  10_920 },
  ];
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const report = searchParams.get("report") ?? "daily";
    const userId = searchParams.get("userId") ?? "user-1";
    const propertyId = searchParams.get("propertyId") ?? undefined;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate e endDate são obrigatórios" },
        { status: 400 }
      );
    }

    const useMock =
      process.env.NEXT_PUBLIC_DATA_MODE === "mock" ||
      (!process.env.GA4_CLIENT_EMAIL && !process.env.GOOGLE_APPLICATION_CREDENTIALS);

    let data: unknown;

    if (report === "daily") {
      data = useMock
        ? mockDailyMetrics(startDate, endDate, userId)
        : await fetchGA4DailyMetrics(startDate, endDate, propertyId);
    } else if (report === "pages") {
      data = useMock
        ? mockTopPages(userId)
        : await fetchGA4TopPages(startDate, endDate, 50, propertyId);
    } else if (report === "users") {
      data = useMock
        ? mockUsersSummary(startDate, endDate, userId)
        : await fetchGA4UsersSummary(startDate, endDate, propertyId);
    } else if (report === "source") {
      data = useMock
        ? mockSessionsBySource()
        : await fetchGA4SessionsByChannel(startDate, endDate, propertyId);
    } else if (report === "devices") {
      data = useMock
        ? mockDeviceBreakdown()
        : await fetchGA4DeviceBreakdown(startDate, endDate, propertyId);
    } else {
      return NextResponse.json({ error: `report "${report}" inválido` }, { status: 400 });
    }

    return NextResponse.json({ data, source: useMock ? "mock" : "ga4" });
  } catch (error: any) {
    console.error("[API /ga4]", error);
    return NextResponse.json(
      { error: error?.message ?? "Erro interno" },
      { status: 500 }
    );
  }
}
