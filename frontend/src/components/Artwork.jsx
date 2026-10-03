// Title art: the poster image when one exists, otherwise a generated gradient
// "key art" in the title's palette so the catalog never shows broken images.
export default function Artwork({ title, size = 'card' }) {
  const [from = '#1f2937', to = '#6b7280'] = title.palette || [];
  if (title.posterUrl) {
    return <img className={`artwork artwork-${size}`} src={title.posterUrl} alt="" loading="lazy" />;
  }
  return (
    <div
      className={`artwork artwork-${size} artwork-generated`}
      style={{ background: `radial-gradient(120% 90% at 85% 10%, ${to}cc 0%, transparent 55%), linear-gradient(140deg, ${from} 0%, #09090b 100%)` }}
      aria-hidden="true"
    >
      <span className="artwork-badge">{title.kind === 'series' ? 'SERIES' : 'FILM'}</span>
      <span className="artwork-title" style={{ textShadow: `0 2px 18px ${to}88` }}>
        {title.title}
      </span>
    </div>
  );
}
