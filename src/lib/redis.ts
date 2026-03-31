const getConfig = () => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
};

/** Executa um comando Redis via Upstash REST API no formato pipeline */
async function cmd(cfg: { url: string; token: string }, command: unknown[]): Promise<unknown> {
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json() as { result: unknown };
  return json.result ?? null;
}

export const redis = {
  async get<T>(key: string): Promise<T | null> {
    const cfg = getConfig();
    if (!cfg) return null;
    const result = await cmd(cfg, ["GET", key]);
    if (result === null || result === undefined) return null;
    if (typeof result === "string") {
      try { return JSON.parse(result) as T; } catch { return result as unknown as T; }
    }
    return result as T;
  },

  async set(key: string, value: unknown): Promise<void> {
    const cfg = getConfig();
    if (!cfg) return;
    await cmd(cfg, ["SET", key, JSON.stringify(value)]);
  },

  async del(key: string): Promise<void> {
    const cfg = getConfig();
    if (!cfg) return;
    await cmd(cfg, ["DEL", key]);
  },

  isConfigured(): boolean {
    return getConfig() !== null;
  },
};
