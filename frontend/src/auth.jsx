import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { endpoints, setUnauthorizedHandler, tokenStore } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return;
    endpoints
      .me()
      .then(({ user }) => setUser(user))
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  const value = useMemo(() => {
    const accept = ({ token, user }) => {
      tokenStore.set(token);
      setUser(user);
    };
    return {
      user,
      loading,
      logout,
      login: async (email, password) => accept(await endpoints.login(email, password)),
      register: async (name, email, password) => accept(await endpoints.register(name, email, password)),
    };
  }, [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
