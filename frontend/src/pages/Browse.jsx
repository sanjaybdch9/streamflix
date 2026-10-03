import { useEffect, useState } from 'react';
import { endpoints } from '../api.js';
import { useAuth } from '../auth.jsx';
import Hero from '../components/Hero.jsx';
import Row from '../components/Row.jsx';
import { useWatchlist } from '../watchlist.jsx';

// Home, Series and Films share one layout; `kind` narrows every row.
export default function Browse({ kind }) {
  const { user } = useAuth();
  const watchlist = useWatchlist();
  const [home, setHome] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);
  const [recs, setRecs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    endpoints.home().then(setHome).catch((e) => setError(e.message));
    // Personal rows are best-effort: the page still works if those services are down.
    endpoints.continueWatching().then((d) => setContinueWatching(d.items)).catch(() => {});
    endpoints.recommendations().then(setRecs).catch(() => {});
  }, []);

  if (error) return <div className="page-message">Could not load the catalog: {error}</div>;
  if (!home) return <div className="splash"><div className="spinner" /></div>;

  const matches = (t) => !kind || t.kind === kind;
  const pick = (items) => items.filter((i) => matches(i.title && typeof i.title === 'object' ? i.title : i));
  const featured = home.featured.filter(matches);

  return (
    <main className="browse">
      <Hero titles={featured.length ? featured : home.rows[0].items.filter(matches).slice(0, 3)} />
      <div className="rows">
        <Row title={`Continue Watching for ${user.name}`} items={pick(continueWatching)} />
        {recs && <Row title={recs.personalized ? `Top Picks for ${user.name}` : 'Popular on StreamFlix'} items={pick(recs.items)} />}
        <Row title="My List" items={pick(watchlist?.items || [])} />
        {home.rows
          .filter((r) => !(kind && r.id === 'series'))
          .map((row) => (
            <Row key={row.id} title={row.title} items={pick(row.items)} />
          ))}
      </div>
    </main>
  );
}
