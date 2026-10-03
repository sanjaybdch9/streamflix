// Title art: a still from the film with the title set over it. Titles without artwork (e.g. ones
// added later by an admin) fall back to a gradient in the title's palette, so nothing ever breaks.
export default function Artwork({ title, size = 'card' }) {
  const [from = '#1f2937', to = '#6b7280'] = title.palette || [];
  const image = size === 'banner' ? title.backdropUrl || title.posterUrl : title.posterUrl;
  const badge = <span className="artwork-badge">{title.kind === 'series' ? 'SERIES' : 'FILM'}</span>;

  if (image) {
    return (
      <div className={`artwork artwork-${size} artwork-image`} aria-hidden="true">
        <img src={image} alt="" loading={size === 'banner' ? 'eager' : 'lazy'} decoding="async" />
        {badge}
        <span className="artwork-title">{title.title}</span>
      </div>
    );
  }
  return (
    <div
      className={`artwork artwork-${size} artwork-generated`}
      style={{ background: `radial-gradient(120% 90% at 85% 10%, ${to}cc 0%, transparent 55%), linear-gradient(140deg, ${from} 0%, #09090b 100%)` }}
      aria-hidden="true"
    >
      {badge}
      <span className="artwork-title" style={{ textShadow: `0 2px 18px ${to}88` }}>
        {title.title}
      </span>
    </div>
  );
}
