// Small wrapper around localStorage for the "cab_token" auth token.
//
// Next.js server-renders client components for the initial HTML, and
// `window`/`localStorage` don't exist in that environment, so every read must
// be guarded or the render throws. Centralizing the guard here means the rest
// of the app can call these helpers unconditionally.
const TOKEN_KEY = 'cab_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}
