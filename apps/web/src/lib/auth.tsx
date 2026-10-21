import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthResponse, LoginInput, RegisterInput, UserDto } from "@osmoguard/contracts";
import { api, refreshSession, setAccessToken, setSessionLostHandler } from "./api";

interface AuthState {
  user: UserDto | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: UserDto) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUserState] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  const accept = useCallback((r: AuthResponse) => {
    setAccessToken(r.accessToken);
    setUserState(r.user);
    setStatus("authenticated");
  }, []);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUserState(null);
    setStatus("anonymous");
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setSessionLostHandler(clear);
    // Restaura la sesión a partir de la cookie HttpOnly del refresh token.
    refreshSession()
      .then((r) => (r ? accept(r) : clear()))
      .catch(() => clear());
  }, [accept, clear]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      status,
      login: async (input) => accept(await api<AuthResponse>("/auth/login", { method: "POST", json: input, auth: false })),
      register: async (input) => accept(await api<AuthResponse>("/auth/register", { method: "POST", json: input, auth: false })),
      logout: async () => {
        await api("/auth/logout", { method: "POST", auth: false }).catch(() => undefined);
        clear();
      },
      setUser: setUserState,
    }),
    [user, status, accept, clear],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
