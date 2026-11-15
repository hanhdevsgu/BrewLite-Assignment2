const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Khi truy cập qua Cloudflare Tunnel hoặc tên miền công khai -> dùng đường dẫn tương đối /api
    if (host.includes('trycloudflare.com') || host.includes('ngrok') || host.includes('loca.lt')) {
      return '/api';
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:3001/api';
    }
    // Production (Vercel / custom domain): ưu tiên NEXT_PUBLIC_API_URL nếu khác localhost, ngược lại dùng Next.js rewrite /api
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost') && !process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1')) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
    }
    return '/api';
  }
  return API_URL.replace(/\/+$/, '');
}

const COLD_START_RETRY_DELAYS_MS = [1500, 3000];

function isRetryableGatewayStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

async function fetchWithColdStartRetry(url: string, init: RequestInit): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';

  let lastError: unknown;
  const maxAttempts = canRetry ? 1 + COLD_START_RETRY_DELAYS_MS.length : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (!canRetry || !isRetryableGatewayStatus(response.status) || attempt === maxAttempts - 1) {
        return response;
      }
    } catch (err) {
      lastError = err;
      if (!canRetry || attempt === maxAttempts - 1) {
        throw err;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, COLD_START_RETRY_DELAYS_MS[attempt]));
  }

  throw lastError instanceof Error ? lastError : new Error('Không thể kết nối máy chủ API');
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessTokenOnce(baseUrl: string, refreshToken: string): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const refreshJson = await refreshResponse.json();
        const tokenData = refreshJson?.data || refreshJson;

        if (refreshResponse.ok && tokenData?.accessToken) {
          localStorage.setItem('brewlite_token', tokenData.accessToken);
          if (tokenData.refreshToken) {
            localStorage.setItem('brewlite_refresh_token', tokenData.refreshToken);
          }
          return String(tokenData.accessToken);
        }
        return null;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('brewlite_token') : null;
  const optionHeaders = (options.headers as Record<string, string> | undefined) || {};
  const retryable = optionHeaders['X-Retry-After-Refresh'] !== '1';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...optionHeaders,
  };
  delete headers['X-Retry-After-Refresh'];

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  const response = await fetchWithColdStartRetry(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && typeof window !== 'undefined' && retryable) {
    const refreshToken = localStorage.getItem('brewlite_refresh_token');
    if (refreshToken) {
      const newAccessToken = await refreshAccessTokenOnce(baseUrl, refreshToken);
      if (newAccessToken) {
        return fetchApi<T>(endpoint, {
          ...options,
          headers: {
            ...optionHeaders,
            'X-Retry-After-Refresh': '1',
          },
        });
      }
    }

    localStorage.removeItem('brewlite_token');
    localStorage.removeItem('brewlite_refresh_token');
    localStorage.removeItem('brewlite_user');
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
  }

  let data: Record<string, unknown> | null = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const rawError = data?.message || data?.error || 'Đã có lỗi xảy ra khi gọi API';
    const message = Array.isArray(rawError) ? rawError.join(', ') : String(rawError);
    throw new ApiError(message, response.status);
  }

  // Bóc tách format của TransformInterceptor: { success, data, ... }
  if (data && 'data' in data && data.data !== undefined) {
    return data.data as T;
  }
  return data as T;
}
