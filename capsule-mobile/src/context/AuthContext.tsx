import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { getItem, removeItem, setItem } from '@/utils/storage';

type AuthContextValue = {
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const TOKEN_KEY = 'capsule_auth_token';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await getItem(TOKEN_KEY);
        setToken(storedToken);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  const login = async (newToken: string) => {
    await setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await removeItem(TOKEN_KEY);
    setToken(null);
  };

  const value = useMemo(
    () => ({
      token,
      isLoading,
      login,
      logout,
    }),
    [token, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthProvider;
