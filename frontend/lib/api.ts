import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
import { useAuthStore } from "@/store/authStore";
import type { AuthUser } from "@/types";

// Backend serves the API under /v1 (see backend/src/app.ts)
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/v1";

// ─── Axios Instance ───────────────────────────────────────────────────────────

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends HttpOnly refresh-token cookie
  headers: { "Content-Type": "application/json" },
});

// ─── Request Interceptor — attach access token ────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor — handle 401, refresh token ────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Never attempt a token refresh for auth endpoints themselves: a 401
    // from /auth/login means bad credentials, and refreshing would just
    // trigger a pointless /auth/refresh round-trip (burning the shared
    // auth rate-limit bucket) before surfacing the original error.
    const url = originalRequest.url ?? "";
    const isAuthEndpoint = url.startsWith("/auth/");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token is sent via HttpOnly cookie automatically
        const { data } = await axios.post<{ accessToken: string }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);

        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Health / feature flags ───────────────────────────────────────────────────

export interface ApiFeatures {
  email: boolean;
  ai: boolean;
  billing: boolean;
}

/** GET /health (outside /v1) — tells which integrations run in demo mode. */
export async function getFeatures(): Promise<ApiFeatures | null> {
  try {
    const origin = BASE_URL.replace(/\/v1\/?$/, "");
    const { data } = await axios.get<{ features?: ApiFeatures }>(`${origin}/health`);
    return data.features ?? null;
  } catch {
    return null;
  }
}

/** Restore a session from the HttpOnly refresh cookie. Returns false if none. */
export async function restoreSession(): Promise<boolean> {
  try {
    const { data } = await axios.post<{ accessToken: string; user: AuthUser }>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    const { user, setAuth } = useAuthStore.getState();
    // Keep richer /account fields already in the store
    setAuth({ ...user, ...data.user }, data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export const DEMO_CREDENTIALS = { email: "demo@invoiceai.com", password: "Demo1234!" };

// ─── Typed API helpers ────────────────────────────────────────────────────────

export function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Backend error envelope: { success: false, error: { code, message } }
    const data = error.response?.data as
      | { error?: { message?: string } | string; message?: string }
      | undefined;
    if (typeof data?.error === "string") return data.error;
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    return error.message || "An unexpected error occurred";
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
