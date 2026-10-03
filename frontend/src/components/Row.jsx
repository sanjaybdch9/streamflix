import { useRef } from 'react';
import TitleCard from './TitleCard.jsx';

// A horizontally scrolling shelf. `items` are either titles or library entries
// ({ titleId, title, positionSeconds, ... }) so progress bars can render.
export default function Row({ title, items }) {
  const track = useRef(null);
  if (!items?.length) return null;
  const scroll = (dir) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.85, behavior: 'smooth' });

  return (
    <section className="row">
      <h2>{title}</h2>
      <div className="row-viewport">
        <button className="row-arrow left" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}>‹</button>
        <div className="row-track" ref={track}>
          {items.map((item) => {
            const t = item.title && typeof item.title === 'object' ? item.title : item;
            const progress = item.positionSeconds !== undefined ? item : undefined;
            return <TitleCard key={t.id} title={t} progress={progress} caption={item.reason} />;
          })}
        </div>
        <button className="row-arrow right" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}>›</button>
      </div>
    </section>
  );
}
