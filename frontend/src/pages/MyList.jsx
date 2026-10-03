import TitleCard from '../components/TitleCard.jsx';
import { useWatchlist } from '../watchlist.jsx';

export default function MyList() {
  const { items } = useWatchlist();
  const titles = items.filter((i) => i.title && typeof i.title === 'object');
  return (
    <main className="page">
      <h1>My List</h1>
      {titles.length === 0 ? (
        <p className="muted">Titles you add with + appear here.</p>
      ) : (
        <div className="grid">
          {titles.map((i) => (
            <TitleCard key={i.titleId} title={i.title} />
          ))}
        </div>
      )}
    </main>
  );
}
