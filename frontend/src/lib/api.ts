"use client";

/**
 * Thin API client with transparent JWT refresh.
 *
 * On a 401 it tries the refresh token exactly once, replays the original
 * request, and on failure clears the session. Tokens live in localStorage
 * for session persistence across reloads.
 */
const ACCESS = "shizuka_access";
const REFRESH = "shizuka_refresh";
const ACTIVE_ORG = "shizuka_active_org";

export const tokenStore = {
  get access() {
    return typeof window === "undefined" ? null : localStorage.getItem(ACCESS);
  },
  get refresh() {
    return typeof window === "undefined" ? null : localStorage.getItem(REFRESH);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(ACTIVE_ORG);
  },
};

/**
 * Active tenant context for HEAD_ADMIN users. Tenant users have their org
 * pinned by the JWT so this is ignored server-side, but reading it on every
 * request lets a platform owner browse a chosen tenant's data without manually
 * threading `?organization_id=` through every call.
 */
export const tenantStore = {
  get activeOrgId(): number | null {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(ACTIVE_ORG);
    return v ? Number(v) : null;
  },
  set(id: number | null) {
    if (id == null) localStorage.removeItem(ACTIVE_ORG);
    else localStorage.setItem(ACTIVE_ORG, String(id));
  },
};

// Endpoints that are NOT tenant-scoped — never append organization_id to these.
const NON_TENANT_PREFIXES = ["/auth", "/organizations"];

const BASE = "/api/v1";

async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  tokenStore.set(data.access_token, data.refresh_token);
  return true;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body)
    headers.set("Content-Type", "application/json");
  const access = tokenStore.access;
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const orgId = tenantStore.activeOrgId;
  const isTenantScoped =
    !NON_TENANT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  let finalPath = path;
  if (orgId && isTenantScoped) {
    const sep = path.includes("?") ? "&" : "?";
    finalPath = `${path}${sep}organization_id=${orgId}`;
  }

  const res = await fetch(`${BASE}${finalPath}`, { ...options, headers });

  if (res.status === 401 && retry && (await refreshTokens())) {
    return request<T>(path, options, false);
  }

  if (res.status === 204) return undefined as T;

  const isPdf = res.headers.get("content-type")?.includes("application/pdf");
  if (isPdf) return (await res.blob()) as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data?.detail || res.statusText || "Request failed");
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};
