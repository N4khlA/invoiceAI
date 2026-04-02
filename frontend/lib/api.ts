import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
import { useAuthStore } from "@/store/authStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

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

    if (error.response?.status === 401 && !originalRequest._retry) {
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

// ─── Typed API helpers ────────────────────────────────────────────────────────

export function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? "An unexpected error occurred";
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
