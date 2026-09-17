import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  clearTokens,
  hasStoredSession,
  storedRefreshToken,
} from "../api/client";
import { sovaApi } from "../api/sovaApi";
import { toUser } from "../api/adapters";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(hasStoredSession());

  useEffect(() => {
    if (!hasStoredSession()) return;
    sovaApi
      .me()
      .then((dto) => setUser(toUser(dto)))
      .catch(() => clearTokens())
      .finally(() => setIsInitializing(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      login: async (email, password) => {
        await sovaApi.login({ email, password });
        const authenticated = toUser(await sovaApi.me());
        if (!authenticated.active) {
          clearTokens();
          throw new Error("Tài khoản đã bị vô hiệu hóa.");
        }
        setUser(authenticated);
      },
      logout: async () => {
        const refreshToken = storedRefreshToken();
        try {
          if (refreshToken) await sovaApi.logout(refreshToken);
          else clearTokens();
        } finally {
          clearTokens();
          setUser(null);
        }
      },
    }),
    [isInitializing, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
