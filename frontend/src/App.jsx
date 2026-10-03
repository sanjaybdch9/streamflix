import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Navbar from './components/Navbar.jsx';
import Browse from './pages/Browse.jsx';
import Login from './pages/Login.jsx';
import MyList from './pages/MyList.jsx';
import Search from './pages/Search.jsx';
import Status from './pages/Status.jsx';
import Watch from './pages/Watch.jsx';
import { TitleModalProvider } from './modal.jsx';
import { WatchlistProvider } from './watchlist.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="splash"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/status" element={<Status />} />
      <Route
        path="/watch/:id"
        element={
          <Protected>
            <Watch />
          </Protected>
        }
      />
      <Route
        path="*"
        element={
          <Protected>
            <WatchlistProvider>
              <TitleModalProvider>
                <Navbar />
                <Routes>
                  <Route path="/" element={<Browse />} />
                  <Route path="/series" element={<Browse kind="series" />} />
                  <Route path="/movies" element={<Browse kind="movie" />} />
                  <Route path="/my-list" element={<MyList />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </TitleModalProvider>
            </WatchlistProvider>
          </Protected>
        }
      />
    </Routes>
  );
}
