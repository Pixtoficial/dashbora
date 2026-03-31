import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const STORE_KEY = "dash_manual_v1";

/** GET /api/store — retorna o store completo */
export async function GET() {
  if (!redis.isConfigured()) return NextResponse.json({});
  const data = await redis.get<Record<string, unknown>>(STORE_KEY);
  return NextResponse.json(data ?? {});
}

/** POST /api/store — atualiza uma seção { section, data } */
export async function POST(req: NextRequest) {
  if (!redis.isConfigured()) return NextResponse.json({ ok: false }, { status: 503 });

  const body = await req.json() as { section: string; data: unknown };
  const store = (await redis.get<Record<string, unknown>>(STORE_KEY)) ?? {};
  store[body.section] = body.data;
  await redis.set(STORE_KEY, store);
  return NextResponse.json({ ok: true });
}

/** DELETE /api/store — remove uma seção { section } */
export async function DELETE(req: NextRequest) {
  if (!redis.isConfigured()) return NextResponse.json({ ok: false }, { status: 503 });

  const body = await req.json() as { section: string };
  const store = (await redis.get<Record<string, unknown>>(STORE_KEY)) ?? {};
  delete store[body.section];
  await redis.set(STORE_KEY, store);
  return NextResponse.json({ ok: true });
}
