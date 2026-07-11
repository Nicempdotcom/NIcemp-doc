/**
 * WebhookRepository
 *
 * Local-only CRUD for "planned" webhook endpoints (Configurações > Webhooks).
 * There is no backend server to actually dispatch these yet — this is purely
 * the configuration layer for when one exists. Never mixed with
 * StorageService/Supabase.
 */

export interface WebhookEntry {
  id:    string;
  name:  string;
  url:   string;
  event: string;
}

const STORAGE_KEY = 'nicemp:webhooks';

function read(): WebhookEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: WebhookEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable — nothing to persist.
  }
}

export const WEBHOOK_EVENTS = [
  { value: 'project_analyzed',  label: 'Novo upload analisado' },
  { value: 'version_created',   label: 'Nova versão criada' },
  { value: 'history_reset',     label: 'Histórico resetado' },
] as const;

export const WebhookRepository = {
  findAll(): WebhookEntry[] {
    return read();
  },

  add(entry: Omit<WebhookEntry, 'id'>): WebhookEntry {
    const full: WebhookEntry = { ...entry, id: crypto.randomUUID() };
    write([...read(), full]);
    return full;
  },

  remove(id: string): void {
    write(read().filter((e) => e.id !== id));
  },
} as const;
