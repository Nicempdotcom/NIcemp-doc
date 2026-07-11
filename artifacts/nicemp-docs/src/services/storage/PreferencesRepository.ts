/**
 * PreferencesRepository
 *
 * Browser-local UI preferences (NOT documentation data — never synced to
 * Supabase, never mixed with StorageService). Persisted directly in
 * localStorage under a single namespaced key.
 */

export type DateFormat = 'dd/MM/yyyy' | 'MM/dd/yyyy';

export interface Preferences {
  sidebarDefaultCollapsed: boolean;
  autoOpenLastProject: boolean;
  compactTables: boolean;
  dateFormat: DateFormat;
  timezone: string;
}

const STORAGE_KEY = 'nicemp:preferences';
const EVENT_NAME = 'nicemp:preferences-changed';

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}

export const DEFAULT_PREFERENCES: Preferences = {
  sidebarDefaultCollapsed: true,
  autoOpenLastProject: true,
  compactTables: false,
  dateFormat: 'dd/MM/yyyy',
  timezone: detectTimezone(),
};

function read(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Reflects preferences that have a global visual effect onto the <html> element. */
function applyDomEffects(prefs: Preferences): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-density', prefs.compactTables ? 'compact' : 'comfortable');
}

function write(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable (e.g. private mode) — preference just won't survive a reload.
  }
  applyDomEffects(prefs);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<Preferences>(EVENT_NAME, { detail: prefs }));
  }
}

export const PreferencesRepository = {
  get(): Preferences {
    return read();
  },

  update(patch: Partial<Preferences>): Preferences {
    const next = { ...read(), ...patch };
    write(next);
    return next;
  },

  /** Re-applies DOM side effects for the currently stored preferences (call once on app boot). */
  applyDomEffects(): void {
    applyDomEffects(read());
  },

  /** Subscribe to preference changes made anywhere in the app (same tab). Returns an unsubscribe fn. */
  subscribe(listener: (prefs: Preferences) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => listener((e as CustomEvent<Preferences>).detail);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  },
} as const;
