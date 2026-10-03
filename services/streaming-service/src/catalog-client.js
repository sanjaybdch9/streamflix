import { HttpError } from './lib/observability.js';

export function catalogClient(baseUrl, { timeoutMs = 3000 } = {}) {
  return {
    async source(titleId) {
      const res = await fetch(`${baseUrl}/internal/titles/${encodeURIComponent(titleId)}/source`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 404) throw new HttpError(404, 'Title not found');
      if (!res.ok) throw new HttpError(502, 'Catalog unavailable');
      return res.json();
    },
  };
}
