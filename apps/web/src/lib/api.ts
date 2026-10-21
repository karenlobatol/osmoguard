import type { ApiErrorBody, AuthResponse } from "@osmoguard/contracts";

import { Capacitor } from "@capacitor/core";

const SERVER_KEY = "og_api_url";
const BUILD_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "/api";

/** En la web la API comparte origen (/api). En el APK se usa VITE_API_URL o el servidor configurado por el usuario (solo HTTPS). */
export function getApiUrl(): string {
  if (Capacitor.isNativePlatform()) {
    const custom = localStorage.getItem(SERVER_KEY);
    if (custom) return custom;
  }
  return BUILD_API_URL;
}

export function setApiServer(url: string | null) {
  if (!url) return localStorage.removeItem(SERVER_KEY);
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("El servidor debe usar HTTPS");
  const path = u.pathname.replace(/\/+$/, "");
  localStorage.setItem(SERVER_KEY, `${u.origin}${path.endsWith("/api") ? path : `${path}/api`}`);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

// El token de acceso vive solo en memoria: nunca en localStorage ni en cachés del service worker.
let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;
let refreshing: Promise<AuthResponse | null> | null = null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const setSessionLostHandler = (fn: () => void) => {
  onSessionLost = fn;
};

async function parse(res: Response) {
  if (res.status === 204) return undefined;
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

/** Renovación con un único vuelo concurrente por pestaña. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "X-Osmoguard-Csrf": "1" },
      }).catch(() => null);
      if (!res) throw new ApiError(0, "NETWORK", "Sin conexión con el servidor");
      if (res.status === 409) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const body = (await res.json()) as AuthResponse;
      accessToken = body.accessToken;
      return body;
    }
    return null;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown; auth?: boolean } = {}): Promise<T> {
  const { json, auth = true, headers, ...rest } = init;
  const doFetch = () =>
    fetch(`${getApiUrl()}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        "X-Osmoguard-Csrf": "1",
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

  let res: Response;
  try {
    res = await doFetch();
    if (res.status === 401 && auth) {
      const renewed = await refreshSession();
      if (!renewed) {
        onSessionLost?.();
        throw new ApiError(401, "UNAUTHORIZED", "Su sesión ha caducado. Inicie sesión de nuevo.");
      }
      res = await doFetch();
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "NETWORK", navigator.onLine ? "No se pudo contactar con el servidor" : "Sin conexión a internet");
  }
  const body = await parse(res).catch(() => undefined);
  if (!res.ok) {
    const e = (body as ApiErrorBody | undefined)?.error;
    throw new ApiError(res.status, e?.code ?? "HTTP_ERROR", e?.message ?? `Error ${res.status}`, e?.details);
  }
  return body as T;
}
