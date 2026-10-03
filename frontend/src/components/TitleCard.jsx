import { useTitleModal } from '../modal.jsx';
import Artwork from './Artwork.jsx';

export default function TitleCard({ title, progress, caption }) {
  const openModal = useTitleModal();
  const pct = progress?.durationSeconds ? Math.min(100, (progress.positionSeconds / progress.durationSeconds) * 100) : 0;
  return (
    <button className="card" onClick={() => openModal(title)} aria-label={`${title.title} — details`}>
      <Artwork title={title} />
      {pct > 0 && (
        <div className="card-progress" aria-label={`${Math.round(pct)}% watched`}>
          <div style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="card-meta">
        <span className="match">{title.maturity}</span>
        <span>{title.year}</span>
        <span>{title.genres.slice(0, 2).join(' · ')}</span>
      </div>
      {caption && <div className="card-caption">{caption}</div>}
    </button>
  );
}
