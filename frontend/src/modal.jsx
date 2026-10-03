import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { endpoints } from './api.js';
import Artwork from './components/Artwork.jsx';
import { useWatchlist } from './watchlist.jsx';

const ModalContext = createContext(() => {});

export function TitleModalProvider({ children }) {
  const [title, setTitle] = useState(null);
  const open = useCallback((t) => setTitle(t), []);
  return (
    <ModalContext.Provider value={open}>
      {children}
      {title && <TitleModal title={title} onClose={() => setTitle(null)} onSelect={setTitle} />}
    </ModalContext.Provider>
  );
}

export const useTitleModal = () => useContext(ModalContext);

function TitleModal({ title, onClose, onSelect }) {
  const navigate = useNavigate();
  const watchlist = useWatchlist();
  const [similar, setSimilar] = useState([]);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    setSimilar([]);
    setProgress(null);
    endpoints.similar(title.id).then((d) => setSimilar(d.items)).catch(() => {});
    endpoints.progress(title.id).then((d) => setProgress(d.progress)).catch(() => {});
  }, [title.id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const inList = watchlist?.has(title.id);
  const resumable = progress && !progress.completed && progress.positionSeconds > 5;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title.title} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-art">
          <Artwork title={title} size="banner" />
          <div className="modal-art-actions">
            <button className="btn btn-primary" onClick={() => navigate(`/watch/${title.id}`)}>
              ▶ {resumable ? 'Resume' : 'Play'}
            </button>
            {watchlist && (
              <button className="btn btn-round" onClick={() => watchlist.toggle(title)} aria-label={inList ? 'Remove from My List' : 'Add to My List'}>
                {inList ? '✓' : '+'}
              </button>
            )}
          </div>
        </div>
        <div className="modal-body">
          <div className="modal-main">
            <div className="hero-meta">
              <span className="pill">{title.maturity}</span>
              <span>{title.year}</span>
              <span>{title.kind === 'series' ? `${title.durationMinutes}m episodes` : `${title.durationMinutes} min`}</span>
            </div>
            <p>{title.synopsis}</p>
          </div>
          <div className="modal-side">
            <p><span className="muted">Cast:</span> {title.cast.join(', ')}</p>
            <p><span className="muted">Genres:</span> {title.genres.join(', ')}</p>
          </div>
        </div>
        {similar.length > 0 && (
          <div className="modal-similar">
            <h3>More like this</h3>
            <div className="similar-grid">
              {similar.map((s) => (
                <button key={s.id} className="similar-card" onClick={() => onSelect(s)}>
                  <Artwork title={s} />
                  <div className="similar-meta">
                    <span className="pill">{s.maturity}</span> {s.year}
                  </div>
                  <p>{s.synopsis}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
