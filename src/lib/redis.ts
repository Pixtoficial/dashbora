const getConfig = () => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
};

export const redis = {
  async get<T>(key: string): Promise<T | null> {
    const cfg = getConfig();
    if (!cfg) return null;
    const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json() as { result: string | null };
    if (json.result === null) return null;
    try { return JSON.parse(json.result) as T; } catch { return json.result as unknown as T; }
  },

  async set(key: string, value: unknown): Promise<void> {
    const cfg = getConfig();
    if (!cfg) return;
    await fetch(`${cfg.url}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(value)),
      cache: "no-store",
    });
  },

  async del(key: string): Promise<void> {
    const cfg = getConfig();
    if (!cfg) return;
    await fetch(`${cfg.url}/del/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
  },

  isConfigured(): boolean {
    return getConfig() !== null;
  },
};
