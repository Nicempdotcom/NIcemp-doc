/**
 * HistoryRepository
 *
 * Append-only log of all documentation database events.
 * Entries are never updated — only inserted or (bulk) cleared.
 */

import { StorageService } from '../StorageService';
import type { HistoryEntry, HistoryEventKind } from '../types';

const MAX_HISTORY_ENTRIES = 500;

export const HistoryRepository = {
  findAll(): HistoryEntry[] {
    return StorageService.read<HistoryEntry>('history')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  findById(id: string): HistoryEntry | undefined {
    return StorageService.read<HistoryEntry>('history').find((e) => e.id === id);
  },

  findByProject(projectId: string): HistoryEntry[] {
    return this.findAll().filter((e) => e.projectId === projectId);
  },

  findByKind(kind: HistoryEventKind): HistoryEntry[] {
    return this.findAll().filter((e) => e.kind === kind);
  },

  /** Most recent N entries, newest first. */
  findRecent(limit = 20): HistoryEntry[] {
    return this.findAll().slice(0, limit);
  },

  /**
   * Append a new history entry.
   * Automatically trims the log to MAX_HISTORY_ENTRIES.
   */
  append(entry: HistoryEntry): void {
    const all = StorageService.read<HistoryEntry>('history');
    all.push(entry);
    // Keep newest entries, drop oldest when over limit
    const trimmed = all
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, MAX_HISTORY_ENTRIES);
    StorageService.write<HistoryEntry>('history', trimmed);
  },

  appendMany(entries: HistoryEntry[]): void {
    for (const e of entries) this.append(e);
  },

  clearByProject(projectId: string): void {
    const remaining = this.findAll().filter((e) => e.projectId !== projectId);
    StorageService.write<HistoryEntry>('history', remaining);
  },

  clear(): void {
    StorageService.clearStore('history');
  },

  /** Total number of stored history entries. */
  count(): number {
    return StorageService.read('history').length;
  },
} as const;
