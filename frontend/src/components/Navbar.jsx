import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'solid' : ''}`}>
      <Link to="/" className="logo">STREAMFLIX</Link>
      <div className="nav-links">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/series">Series</NavLink>
        <NavLink to="/movies">Films</NavLink>
        <NavLink to="/my-list">My List</NavLink>
      </div>
      <div className="nav-right">
        <button className="icon-btn" onClick={() => navigate('/search')} aria-label="Search">⌕</button>
        <div className="profile">
          <button className="avatar" onClick={() => setMenuOpen((o) => !o)} aria-label="Account menu">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </button>
          {menuOpen && (
            <div className="menu" onMouseLeave={() => setMenuOpen(false)}>
              <div className="menu-user">
                <strong>{user?.name}</strong>
                <small>{user?.email}</small>
              </div>
              <Link to="/status">System status</Link>
              <button onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
