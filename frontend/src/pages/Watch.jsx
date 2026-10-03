import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../api.js';

const SAVE_EVERY_SECONDS = 10;

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lastSaved = useRef(0);
  // Latest playhead, kept outside the DOM so it can still be saved after unmount.
  const playhead = useRef({ time: 0, duration: 0 });
  const [title, setTitle] = useState(null);
  const [src, setSrc] = useState('');
  const [resumeAt, setResumeAt] = useState(0);
  const [error, setError] = useState('');
  const [chrome, setChrome] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([endpoints.title(id), endpoints.playbackSession(id), endpoints.progress(id).catch(() => ({ progress: null }))])
      .then(([t, session, p]) => {
        if (cancelled) return;
        setTitle(t.title);
        setSrc(session.playbackUrl);
        if (p.progress && !p.progress.completed) setResumeAt(p.progress.positionSeconds);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = useCallback(() => {
    const { time, duration } = playhead.current;
    if (!duration || !Number.isFinite(duration) || time === lastSaved.current) return;
    lastSaved.current = time;
    endpoints.saveProgress(id, time, duration).catch(() => {});
  }, [id]);

  // Save on leave as well as on the periodic heartbeat.
  useEffect(() => () => save(), [save]);

  useEffect(() => {
    let timer;
    const wake = () => {
      setChrome(true);
      clearTimeout(timer);
      timer = setTimeout(() => setChrome(false), 3000);
    };
    window.addEventListener('mousemove', wake);
    wake();
    return () => {
      window.removeEventListener('mousemove', wake);
      clearTimeout(timer);
    };
  }, []);

  if (error) {
    return (
      <div className="player-error">
        <p>Playback failed: {error}</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  return (
    <div className="player">
      <div className={`player-top ${chrome ? '' : 'hidden'}`}>
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        {title && <span className="player-title">{title.title}</span>}
      </div>
      {src ? (
        <video
          src={src}
          controls
          autoPlay
          playsInline
          onLoadedMetadata={(e) => {
            if (resumeAt > 0 && resumeAt < e.currentTarget.duration - 5) e.currentTarget.currentTime = resumeAt;
          }}
          onTimeUpdate={(e) => {
            playhead.current = { time: e.currentTarget.currentTime, duration: e.currentTarget.duration };
            if (Math.abs(e.currentTarget.currentTime - lastSaved.current) >= SAVE_EVERY_SECONDS) save();
          }}
          onPause={save}
          onEnded={save}
          onError={() => setError('the video could not be loaded')}
        />
      ) : (
        <div className="splash"><div className="spinner" /></div>
      )}
    </div>
  );
}
