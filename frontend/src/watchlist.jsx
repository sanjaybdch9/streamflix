import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { endpoints } from './api.js';

// Keeps "My List" membership in one place so every card and modal agrees.
const WatchlistContext = createContext(null);

export function WatchlistProvider({ children }) {
  const [items, setItems] = useState([]);

  const refresh = useCallback(() => endpoints.watchlist().then((d) => setItems(d.items)).catch(() => {}), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    const ids = new Set(items.map((i) => i.titleId));
    return {
      items,
      has: (id) => ids.has(id),
      toggle: async (title) => {
        if (ids.has(title.id)) {
          setItems((cur) => cur.filter((i) => i.titleId !== title.id));
          await endpoints.removeFromList(title.id).catch(refresh);
        } else {
          setItems((cur) => [{ titleId: title.id, title, addedAt: new Date().toISOString() }, ...cur]);
          await endpoints.addToList(title.id).catch(refresh);
        }
      },
    };
  }, [items, refresh]);

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export const useWatchlist = () => useContext(WatchlistContext);
