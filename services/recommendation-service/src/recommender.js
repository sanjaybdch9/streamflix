// Content-based recommender: builds a genre-affinity profile from what the user
// watched (weighted by how much of it they watched) and what they saved, then
// scores unseen titles by genre overlap with a small popularity prior.

const POPULARITY_WEIGHT = 0.3;

function signalWeight(entry) {
  if (entry.completed) return 3;
  const ratio = entry.durationSeconds > 0 ? entry.positionSeconds / entry.durationSeconds : 0;
  return ratio >= 0.25 ? 2 : 1;
}

export function recommend({ titles, history = [], watchlist = [], limit = 12 }) {
  const byId = new Map(titles.map((t) => [t.id, t]));
  const affinity = new Map();
  const sourceFor = new Map(); // genre -> the title that contributed most, for the "because you watched" label
  const seen = new Set();

  const addSignal = (titleId, weight) => {
    const title = byId.get(titleId);
    if (!title) return;
    for (const g of title.genres) {
      affinity.set(g, (affinity.get(g) || 0) + weight);
      if (!sourceFor.has(g) || sourceFor.get(g).weight < weight) sourceFor.set(g, { title, weight });
    }
  };

  for (const h of history) {
    seen.add(h.titleId);
    addSignal(h.titleId, signalWeight(h));
  }
  for (const w of watchlist) {
    seen.add(w.titleId);
    addSignal(w.titleId, 1);
  }

  const maxAffinity = Math.max(1, ...affinity.values());
  const scored = titles
    .filter((t) => !seen.has(t.id))
    .map((t) => {
      const genreScore = t.genres.reduce((sum, g) => sum + (affinity.get(g) || 0), 0) / maxAffinity / Math.sqrt(t.genres.length || 1);
      const score = genreScore + POPULARITY_WEIGHT * (t.popularity / 100);
      const topGenre = [...t.genres].sort((a, b) => (affinity.get(b) || 0) - (affinity.get(a) || 0))[0];
      const because = affinity.get(topGenre) ? sourceFor.get(topGenre)?.title : undefined;
      return {
        ...t,
        score: Number(score.toFixed(4)),
        reason: because ? `Because you watched ${because.title}` : 'Popular on StreamFlix',
      };
    })
    .sort((a, b) => b.score - a.score);

  return { personalized: affinity.size > 0, items: scored.slice(0, limit) };
}

// "More like this": titles ranked by Jaccard similarity of genres.
export function similar({ titles, titleId, limit = 8 }) {
  const target = titles.find((t) => t.id === titleId);
  if (!target) return [];
  const a = new Set(target.genres);
  return titles
    .filter((t) => t.id !== titleId)
    .map((t) => {
      const shared = t.genres.filter((g) => a.has(g)).length;
      const union = new Set([...a, ...t.genres]).size;
      return { ...t, score: shared / union };
    })
    .filter((t) => t.score > 0)
    .sort((x, y) => y.score - x.score || y.popularity - x.popularity)
    .slice(0, limit);
}
