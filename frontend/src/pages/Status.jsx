import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { endpoints } from '../api.js';

// Live view of /api/status: which microservices the gateway can reach.
export default function Status() {
  const [status, setStatus] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);

  useEffect(() => {
    const load = () =>
      endpoints
        .status()
        .then((s) => {
          setStatus(s);
          setCheckedAt(new Date());
        })
        .catch(() => setStatus({ status: 'down', services: [] }));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="page status-page">
      <Link to="/" className="logo">STREAMFLIX</Link>
      <h1>System status</h1>
      {!status ? (
        <div className="spinner small" />
      ) : (
        <>
          <p className={`status-banner ${status.status}`}>
            {status.status === 'ok' ? 'All systems operational' : status.status === 'down' ? 'API gateway unreachable' : 'Some services are degraded'}
          </p>
          <table className="status-table">
            <thead>
              <tr><th>Service</th><th>State</th><th>Latency</th></tr>
            </thead>
            <tbody>
              {status.services.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td><span className={`dot ${s.status}`} /> {s.status}</td>
                  <td>{s.latencyMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          {checkedAt && <p className="muted">Refreshes every 5 s · last checked {checkedAt.toLocaleTimeString()}</p>}
        </>
      )}
    </main>
  );
}
