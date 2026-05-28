function normalizeAbsolutePath(path: string) {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function inferBasePathFromLocation() {
  if (typeof window === 'undefined') {
    return '/';
  }

  const pathname = window.location.pathname || '/';
  if (pathname === '/') {
    return '/';
  }

  const withoutTrailingSlash = pathname.replace(/\/+$/, '') || '/';
  const lastSegment = withoutTrailingSlash.split('/').pop() || '';
  const looksLikeFile = /\.[a-z0-9]+$/i.test(lastSegment);

  if (!looksLikeFile) {
    return withoutTrailingSlash || '/';
  }

  const directory = withoutTrailingSlash.slice(0, withoutTrailingSlash.lastIndexOf('/'));
  return directory || '/';
}

export function getAppBasePath() {
  const rawBase = String(import.meta.env.BASE_URL || '/').trim();
  if (!rawBase || rawBase === '.' || rawBase === './') {
    return inferBasePathFromLocation();
  }

  if (rawBase.startsWith('http://') || rawBase.startsWith('https://')) {
    return normalizeAbsolutePath(new URL(rawBase).pathname);
  }

  if (rawBase.startsWith('/')) {
    return normalizeAbsolutePath(rawBase);
  }

  const normalizedRelativeBase = rawBase.replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
  if (!normalizedRelativeBase) {
    return inferBasePathFromLocation();
  }

  return normalizeAbsolutePath(normalizedRelativeBase);
}

export function resolveApiBaseUrl() {
  const rawBase = String(import.meta.env.VITE_API_BASE_URL || '/api').trim();
  if (!rawBase) {
    return '/api';
  }

  if (rawBase.startsWith('http://') || rawBase.startsWith('https://')) {
    return rawBase.replace(/\/$/, '');
  }

  const appBase = getAppBasePath();
  const normalizedBase = rawBase.startsWith('/')
    ? normalizeAbsolutePath(rawBase)
    : normalizeAbsolutePath(rawBase.replace(/^\.\//, ''));

  if (appBase === '/' || normalizedBase === appBase || normalizedBase.startsWith(`${appBase}/`)) {
    return normalizedBase;
  }

  return `${appBase}${normalizedBase}`.replace(/\/{2,}/g, '/');
}

export function buildAppRelativePath(path: string) {
  const appBase = getAppBasePath().replace(/\/?$/, '/');
  return `${appBase}${path.replace(/^\//, '')}`;
}
