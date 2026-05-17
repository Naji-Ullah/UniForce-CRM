"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, tokenStore } from "./api";

export type Role = "HEAD_ADMIN" | "MANAGER" | "TEACHER";

export interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  organization_id: number | null;
  organization_name: string | null;
}

interface AuthCtx {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (!tokenStore.access) return setLoading(false);
      try {
        setUser(await api.get<CurrentUser>("/auth/me"));
      } catch {
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const tokens = await api.post<{ access_token: string; refresh_token: string }>(
      "/auth/login",
      { email, password }
    );
    tokenStore.set(tokens.access_token, tokens.refresh_token);
    setUser(await api.get<CurrentUser>("/auth/me"));
    router.push("/dashboard");
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
    router.push("/login");
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
