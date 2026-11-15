const LOCAL_BACKEND_FALLBACKS = [
  'http://backend:3001/api',
  'http://brewlite_backend:3001/api',
  'http://127.0.0.1:3001/api',
  'http://localhost:3001/api',
];

function normalizeApiBase(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  let cleaned = rawUrl.trim().replace(/\/:path\*$/, '').replace(/\/+$/, '');
  if (!cleaned) return null;
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    return null;
  }
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
}

export interface BackendTargets {
  configured: string[];
  localFallbacks: string[];
}

/**
 * Resolves candidate NestJS `/api` base URLs, separating explicit configured URLs
 * (e.g. Render production `NEXT_PUBLIC_API_URL`) from local/Docker fallbacks.
 */
export function getBackendApiTargets(): BackendTargets {
  const configuredCandidates = [
    normalizeApiBase(process.env.INTERNAL_BACKEND_URL),
    normalizeApiBase(process.env.API_URL),
    normalizeApiBase(process.env.NEXT_PUBLIC_API_URL),
  ].filter((url): url is string => Boolean(url));

  const configured = Array.from(new Set(configuredCandidates));
  const localFallbacks = LOCAL_BACKEND_FALLBACKS.filter((url) => !configured.includes(url));

  return { configured, localFallbacks };
}

export function buildEndpointUrl(baseUrl: string, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
