import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

// ─── Token helpers ────────────────────────────────────────────────────────────
function getTokens() {
  try {
    const raw = localStorage.getItem('dmv-auth');
    if (!raw) return { access: null, refresh: null };
    const parsed = JSON.parse(raw);
    return {
      access: parsed?.state?.accessToken ?? null,
      refresh: parsed?.state?.refreshToken ?? null,
    };
  } catch {
    return { access: null, refresh: null };
  }
}

function setAccessToken(token: string) {
  try {
    const raw = localStorage.getItem('dmv-auth');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state.accessToken = token;
    localStorage.setItem('dmv-auth', JSON.stringify(parsed));
  } catch {}
}

// ─── Axios instance ───────────────────────────────────────────────────────────
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { access } = getTokens();
  if (access && config.headers) {
    config.headers['Authorization'] = `Bearer ${access}`;
  }
  return config;
});

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            (originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
          }
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refresh } = getTokens();
      if (!refresh) {
        isRefreshing = false;
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh/`, { refresh });
        const newToken = res.data.access;
        setAccessToken(newToken);
        processQueue(null, newToken);
        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function clearAuthAndRedirect() {
  try {
    localStorage.removeItem('dmv-auth');
    // Legacy keys
    localStorage.removeItem('dmv_access');
    localStorage.removeItem('dmv_refresh');
    localStorage.removeItem('dmv_user');
  } catch {}
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

// ─── Typed API helpers ────────────────────────────────────────────────────────
export const api = {
  get: <T = unknown>(path: string, config?: AxiosRequestConfig) =>
    axiosInstance.get<T>(path, config).then((r) => r.data),

  post: <T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.post<T>(path, body, config).then((r) => r.data),

  put: <T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.put<T>(path, body, config).then((r) => r.data),

  patch: <T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.patch<T>(path, body, config).then((r) => r.data),

  delete: <T = unknown>(path: string, config?: AxiosRequestConfig) =>
    axiosInstance.delete<T>(path, config).then((r) => r.data),

  upload: <T = unknown>(path: string, formData: FormData) =>
    axiosInstance
      .post<T>(path, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
};

export default axiosInstance;

// ─── Legacy fetch-based helper (kept for backward compat) ────────────────────
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { access } = getTokens();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...options.headers,
    },
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(json?.detail || json?.error || `Request failed: ${res.status}`);
  }

  return json as T;
}
