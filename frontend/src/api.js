const TOKEN_KEY = 'streamflix.token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable: session lasts until reload */
    }
  },
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  if (res.status === 401 && token) onUnauthorized();
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  return data;
}

export const endpoints = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
  register: (name, email, password) => api('/auth/register', { method: 'POST', body: { name, email, password } }),
  me: () => api('/auth/me'),
  home: () => api('/catalog/home'),
  title: (id) => api(`/catalog/titles/${id}`),
  search: (q, signal) => api(`/catalog/titles?q=${encodeURIComponent(q)}`, { signal }),
  byGenre: (genre) => api(`/catalog/titles?genre=${encodeURIComponent(genre)}`),
  genres: () => api('/catalog/genres'),
  watchlist: () => api('/library/watchlist'),
  addToList: (id) => api(`/library/watchlist/${id}`, { method: 'PUT' }),
  removeFromList: (id) => api(`/library/watchlist/${id}`, { method: 'DELETE' }),
  continueWatching: () => api('/library/continue-watching'),
  progress: (id) => api(`/library/progress/${id}`),
  saveProgress: (id, positionSeconds, durationSeconds) =>
    api(`/library/progress/${id}`, { method: 'PUT', body: { positionSeconds, durationSeconds } }),
  playbackSession: (id) => api(`/stream/${id}/session`, { method: 'POST' }),
  recommendations: () => api('/recommendations'),
  similar: (id) => api(`/recommendations/similar/${id}`),
  status: () => fetch('/api/status').then((r) => r.json()),
};
