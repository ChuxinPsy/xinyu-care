import type { Profile } from '@/types';
import { resolveApiBaseUrl } from '@/lib/runtime-base';

const TOKEN_KEY = 'xinyu-care.access-token';
const SESSION_EVENT = 'xinyu-care:session-changed';

export interface AppUser {
  id: string;
  email?: string;
  user_metadata?: {
    username?: string;
    role?: string;
  };
}

export interface AppSession {
  access_token: string;
  user: AppUser;
}

export interface AuthState {
  session: AppSession | null;
  profile: Profile | null;
}

interface SessionEnvelope {
  accessToken?: string | null;
  user?: AppUser | null;
  profile?: Profile | null;
}

function apiBaseUrl() {
  return resolveApiBaseUrl();
}

function buildUrl(path: string) {
  const base = apiBaseUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function readToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

function writeToken(token: string | null) {
  if (typeof window === 'undefined') {
    return;
  }
  const previous = window.localStorage.getItem(TOKEN_KEY);
  if ((previous || null) === token) {
    return;
  }
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

function authHeaders(token = readToken()) {
  return token ? { Authorization: `Bearer ${token}` } : {};
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

function envelopeToAuthState(envelope: SessionEnvelope | null | undefined): AuthState {
  const accessToken = envelope?.accessToken || null;
  const user = envelope?.user || null;
  return {
    session: accessToken && user ? { access_token: accessToken, user } : null,
    profile: envelope?.profile || null,
  };
}

export function getAccessToken() {
  return readToken();
}

export function getStoredSession(): AppSession | null {
  const token = readToken();
  if (!token) {
    return null;
  }
  return null;
}

export function subscribeAuthStateChange(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener(SESSION_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(SESSION_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export async function getAuthState(): Promise<AuthState> {
  const response = await fetch(buildUrl('/auth/session'), {
    headers: {
      Accept: 'application/json',
      ...authHeaders(),
    },
  });
  if (!response.ok) {
    const payload = await parseJson(response);
    throw new Error(
      typeof payload === 'object' && payload && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : '获取登录状态失败'
    );
  }
  const payload = (await response.json()) as { session?: AppSession | null; profile?: Profile | null };
  if (!payload.session?.access_token) {
    writeToken(null);
    return { session: null, profile: null };
  }
  writeToken(payload.session.access_token);
  return { session: payload.session, profile: payload.profile || null };
}

export async function loginWithPassword(usernameOrEmail: string, password: string): Promise<AuthState> {
  const response = await fetch(buildUrl('/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ usernameOrEmail, password }),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(
      typeof payload === 'object' && payload && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : '登录失败'
    );
  }
  const state = envelopeToAuthState(payload as SessionEnvelope);
  writeToken(state.session?.access_token || null);
  return state;
}

export async function signupWithPassword(payload: {
  username: string;
  password: string;
  role?: 'user' | 'doctor';
  verificationCode?: string;
  email?: string;
}): Promise<AuthState> {
  const response = await fetch(buildUrl('/auth/signup'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await parseJson(response);
  if (!response.ok) {
    throw new Error(
      typeof body === 'object' && body && 'error' in body
        ? String((body as { error: unknown }).error)
        : '注册失败'
    );
  }
  const state = envelopeToAuthState(body as SessionEnvelope);
  writeToken(state.session?.access_token || null);
  return state;
}

export async function logout() {
  const token = readToken();
  writeToken(null);
  if (!token) {
    return;
  }
  try {
    await fetch(buildUrl('/auth/logout'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...authHeaders(token),
      },
    });
  } catch {
    // Ignore network failures during local sign-out.
  }
}
