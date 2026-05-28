import { getAccessToken } from '@/lib/backend-auth';
import { resolveApiBaseUrl } from '@/lib/runtime-base';

export interface FilterCondition {
  op: 'eq' | 'gte' | 'lte';
  field: string;
  value: unknown;
}

export interface OrderCondition {
  field: string;
  ascending: boolean;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
}

interface DataEnvelope<T> {
  data: T;
  error: unknown;
  count?: number;
}

function apiBaseUrl() {
  return resolveApiBaseUrl();
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const base = apiBaseUrl();
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildHeaders(auth = true, contentType = true) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  const token = auth ? getAccessToken() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function resolveErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error: unknown }).error;
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
  }
  return fallback;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method || 'GET',
    headers: options.formData ? buildHeaders(options.auth, false) : buildHeaders(options.auth, true),
    body: options.formData || (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, `请求失败(${response.status})`));
  }
  return payload as T;
}

export async function selectRows<T>(table: string, options: {
  filters?: FilterCondition[];
  orders?: OrderCondition[];
  limit?: number;
  head?: boolean;
  count?: boolean;
} = {}): Promise<DataEnvelope<T[]>> {
  return apiRequest<DataEnvelope<T[]>>(`/data/${table}`, {
    query: {
      select: '*',
      filters: options.filters?.length ? JSON.stringify(options.filters) : undefined,
      orders: options.orders?.length ? JSON.stringify(options.orders) : undefined,
      limit: options.limit,
      head: options.head || undefined,
      count: options.count || undefined,
    },
  });
}

export async function selectMaybeSingle<T>(table: string, options: {
  filters?: FilterCondition[];
  orders?: OrderCondition[];
} = {}): Promise<T | null> {
  const envelope = await selectRows<T>(table, { ...options, limit: 1 });
  return Array.isArray(envelope.data) && envelope.data.length > 0 ? envelope.data[0] : null;
}

export async function insertRow<T>(table: string, data: Record<string, unknown>, options: {
  upsert?: boolean;
  onConflict?: string;
  single?: boolean;
} = {}): Promise<T> {
  const envelope = await apiRequest<DataEnvelope<T | T[]>>(`/data/${table}`, {
    method: 'POST',
    body: {
      data,
      upsert: options.upsert || false,
      onConflict: options.onConflict,
      single: options.single !== false,
    },
  });
  return Array.isArray(envelope.data) ? envelope.data[0] : envelope.data;
}

export async function updateRow<T>(
  table: string,
  data: Record<string, unknown>,
  filters: FilterCondition[],
  single = true
): Promise<T> {
  const envelope = await apiRequest<DataEnvelope<T | T[]>>(`/data/${table}`, {
    method: 'PATCH',
    body: { data, filters, single },
  });
  return Array.isArray(envelope.data) ? envelope.data[0] : envelope.data;
}

export async function deleteRows(table: string, filters: FilterCondition[]) {
  await apiRequest<DataEnvelope<null>>(`/data/${table}`, {
    method: 'DELETE',
    body: { filters },
  });
}

export async function callRpc<T>(name: string, payload: Record<string, unknown>) {
  const envelope = await apiRequest<DataEnvelope<T>>(`/rpc/${name}`, {
    method: 'POST',
    body: payload,
  });
  return envelope.data;
}

export async function invokeFunction<T>(name: string, payload: Record<string, unknown>) {
  const envelope = await apiRequest<DataEnvelope<T>>(`/functions/${name}`, {
    method: 'POST',
    body: payload,
  });
  return envelope.data;
}

export async function uploadStorageFile(bucket: string, path: string, file: File) {
  const formData = new FormData();
  formData.append('path', path);
  formData.append('file', file);
  const response = await apiRequest<{ data: { path: string; publicUrl: string } }>(`/storage/${bucket}/upload`, {
    method: 'POST',
    formData,
  });
  return response.data;
}

export async function deleteStorageFiles(bucket: string, paths: string[]) {
  await apiRequest(`/storage/${bucket}`, {
    method: 'DELETE',
    body: { paths },
  });
}

export function publicStorageUrl(bucket: string, path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = apiBaseUrl();
  return `${base}/storage/public/${bucket}/${path}`.replace(/([^:]\/)\/+/g, '$1');
}
