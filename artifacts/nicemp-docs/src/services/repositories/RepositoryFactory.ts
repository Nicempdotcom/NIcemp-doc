/**
 * RepositoryFactory
 *
 * Central factory for obtaining RepositoryProvider instances and managing
 * GitHub session state (token stored in sessionStorage — cleared on tab close).
 *
 * Add new providers here (GitLab, Bitbucket, Azure DevOps) without touching
 * the pipeline or UI pages.
 */

import type { GitHubUser } from './types';
import type { RepositoryProvider } from './types';
import { gitHubProvider }          from './GitHubProvider';
import { zipProvider }             from './ZipProvider';

// ─── Provider registry ────────────────────────────────────────────────────────

export type ProviderKey = 'github' | 'zip';

const PROVIDERS: Record<ProviderKey, RepositoryProvider> = {
  github: gitHubProvider,
  zip:    zipProvider,
};

export function getProvider(key: ProviderKey): RepositoryProvider {
  return PROVIDERS[key];
}

// ─── GitHub session management ────────────────────────────────────────────────
// Token stored in sessionStorage so it survives page reloads within the same
// tab session but is automatically cleared when the tab is closed.
// Never stored in localStorage, cookies, or IndexedDB.

const SESSION_KEY = 'nicemp:github:token';
const USER_KEY    = 'nicemp:github:user';

export const GitHubSession = {
  getToken(): string | null {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    try {
      sessionStorage.setItem(SESSION_KEY, token);
    } catch {
      // sessionStorage unavailable — token won't persist but auth still works
    }
  },

  getUser(): GitHubUser | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) as GitHubUser : null;
    } catch {
      return null;
    }
  },

  setUser(user: GitHubUser): void {
    try {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {/* ignore */}
  },

  clear(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch {/* ignore */}
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
