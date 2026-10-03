// Calls to other services. Each call has a timeout so a slow dependency
// degrades recommendations instead of hanging the request.
async function getJson(url, { headers = {}, timeoutMs = 3000 } = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.json();
}

export function serviceClients({ catalogUrl, libraryUrl }) {
  return {
    allTitles: async () => (await getJson(`${catalogUrl}/catalog/titles?limit=200`)).items,
    signals: (userId) => getJson(`${libraryUrl}/library/signals`, { headers: { 'x-user-id': userId } }),
  };
}
