const PUBLIC_BASE_URL = import.meta.env.BASE_URL || '/';

export function publicAssetUrl(path?: string | null) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  const base = PUBLIC_BASE_URL.replace(/\/?$/, '/');
  if (path === base.slice(0, -1) || path.startsWith(base)) return path;

  const cleanPath = path.replace(/^\/+/, '');
  return `${base}${cleanPath}`;
}
