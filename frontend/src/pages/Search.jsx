import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { endpoints } from '../api.js';
import TitleCard from '../components/TitleCard.jsx';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [genre, setGenre] = useState('');
  const [genres, setGenres] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    endpoints.genres().then((d) => setGenres(d.genres)).catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = q.trim() ? await endpoints.search(q.trim(), controller.signal) : genre ? await endpoints.byGenre(genre) : { items: [] };
        setResults(genre && q.trim() ? data.items.filter((t) => t.genres.includes(genre)) : data.items);
      } catch {
        /* aborted or failed: keep previous results */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, genre]);

  return (
    <main className="page">
      <input
        className="search-input"
        autoFocus
        placeholder="Titles, people, genres"
        value={q}
        onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
      />
      <div className="chips">
        {genres.map((g) => (
          <button key={g.name} className={`chip ${genre === g.name ? 'active' : ''}`} onClick={() => setGenre(genre === g.name ? '' : g.name)}>
            {g.name}
          </button>
        ))}
      </div>
      {loading && <div className="spinner small" />}
      {!loading && (q || genre) && results.length === 0 && <p className="muted">No matches. Try another title, actor or genre.</p>}
      <div className="grid">
        {results.map((t) => (
          <TitleCard key={t.id} title={t} />
        ))}
      </div>
    </main>
  );
}
