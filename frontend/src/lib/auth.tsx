"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, tenantStore, tokenStore } from "./api";

export type Role = "HEAD_ADMIN" | "MANAGER" | "TEACHER" | "STUDENT";

export const STUDENT_HOME = "/student/dashboard";
export const STAFF_HOME = "/dashboard";
function homeFor(role: Role) {
  return role === "STUDENT" ? STUDENT_HOME : STAFF_HOME;
}

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
  activeOrgId: number | null;
  setActiveOrg: (id: number | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrgId, setActiveOrgIdState] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    setActiveOrgIdState(tenantStore.activeOrgId);
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

  function setActiveOrg(id: number | null) {
    tenantStore.set(id);
    setActiveOrgIdState(id);
  }

  async function login(email: string, password: string) {
    const tokens = await api.post<{ access_token: string; refresh_token: string }>(
      "/auth/login",
      { email, password }
    );
    tokenStore.set(tokens.access_token, tokens.refresh_token);
    const me = await api.get<CurrentUser>("/auth/me");
    setUser(me);

    // Head Admin needs to target a tenant for every tenant-scoped endpoint.
    // Auto-pick the first org so the dashboard isn't empty on first login.
    if (me.role === "HEAD_ADMIN") {
      try {
        const orgs = await api.get<{ id: number }[]>("/organizations");
        if (orgs[0]) setActiveOrg(orgs[0].id);
      } catch {
        /* non-fatal */
      }
    } else {
      setActiveOrg(null);
    }

    router.push(homeFor(me.role));
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
    setActiveOrgIdState(null);
    router.push("/login");
  }

  return (
    <Ctx.Provider value={{ user, loading, activeOrgId, setActiveOrg, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
