import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTitleModal } from '../modal.jsx';

// Rotating billboard for featured titles.
export default function Hero({ titles }) {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const openModal = useTitleModal();

  useEffect(() => {
    if (titles.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % titles.length), 9000);
    return () => clearInterval(t);
  }, [titles.length]);

  const title = titles[index];
  if (!title) return <div className="hero hero-empty" />;
  const [from = '#111', to = '#e50914'] = title.palette || [];

  return (
    <header
      className="hero"
      style={{ background: `radial-gradient(80% 120% at 85% 20%, ${to}66 0%, transparent 60%), linear-gradient(110deg, #0b0b0f 25%, ${from} 100%)` }}
    >
      <div className="hero-content" key={title.id}>
        <p className="hero-kicker">{title.kind === 'series' ? 'S E R I E S' : 'F I L M'}</p>
        <h1>{title.title}</h1>
        <div className="hero-meta">
          <span className="pill">{title.maturity}</span>
          <span>{title.year}</span>
          <span>{title.kind === 'series' ? `${title.durationMinutes}m episodes` : `${Math.floor(title.durationMinutes / 60)}h ${title.durationMinutes % 60}m`}</span>
          <span>{title.genres.join(' · ')}</span>
        </div>
        <p className="hero-synopsis">{title.synopsis}</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/watch/${title.id}`)}>▶ Play</button>
          <button className="btn btn-secondary" onClick={() => openModal(title)}>ⓘ More info</button>
        </div>
      </div>
      {titles.length > 1 && (
        <div className="hero-dots">
          {titles.map((t, i) => (
            <button key={t.id} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Show ${t.title}`} />
          ))}
        </div>
      )}
    </header>
  );
}
