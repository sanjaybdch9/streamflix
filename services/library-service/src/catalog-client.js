// Service-to-service call to catalog-service to turn title ids into full titles.
export function catalogClient(baseUrl, { timeoutMs = 3000 } = {}) {
  return {
    async titlesByIds(ids) {
      if (ids.length === 0) return new Map();
      const res = await fetch(`${baseUrl}/catalog/titles?ids=${ids.map(encodeURIComponent).join(',')}&limit=200`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`catalog-service responded ${res.status}`);
      const { items } = await res.json();
      return new Map(items.map((t) => [t.id, t]));
    },
  };
}
