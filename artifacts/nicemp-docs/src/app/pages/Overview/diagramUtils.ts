/**
 * diagramUtils.ts
 *
 * Shared helpers for the "Organograma" page (EPIC 11): deterministic module
 * colors, a simple longest-path leveling algorithm for the navigation-flow
 * diagram, and column/row layout for the layered architecture diagram.
 */

import { createContext } from 'react';

export type GraphCategory = 'page' | 'component' | 'hook' | 'api' | 'database';

export const CATEGORY_META: Record<GraphCategory, { label: string; border: string; bg: string; text: string; dot: string }> = {
  page:      { label: 'Página',    border: 'border-blue-500/40',    bg: 'bg-blue-500/5',    text: 'text-blue-700 dark:text-blue-400',       dot: 'bg-blue-500' },
  component: { label: 'Componente', border: 'border-violet-500/40', bg: 'bg-violet-500/5',  text: 'text-violet-700 dark:text-violet-400',    dot: 'bg-violet-500' },
  hook:      { label: 'Hook',      border: 'border-amber-500/40',   bg: 'bg-amber-500/5',   text: 'text-amber-700 dark:text-amber-400',      dot: 'bg-amber-500' },
  api:       { label: 'API',       border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', text: 'text-emerald-700 dark:text-emerald-400',  dot: 'bg-emerald-500' },
  database:  { label: 'Banco de Dados', border: 'border-rose-500/40', bg: 'bg-rose-500/5',  text: 'text-rose-700 dark:text-rose-400',        dot: 'bg-rose-500' },
};

/** Solid colors per category type, used in Visão Simples. */
export const SIMPLE_CATEGORY_STYLE: Record<GraphCategory, { bg: string; border: string; nameText: string; descText: string }> = {
  page:      { bg: 'bg-blue-100 dark:bg-blue-900/50',     border: 'border-blue-300 dark:border-blue-600',     nameText: 'text-blue-900 dark:text-blue-100',    descText: 'text-blue-700 dark:text-blue-300' },
  component: { bg: 'bg-violet-100 dark:bg-violet-900/50', border: 'border-violet-300 dark:border-violet-600', nameText: 'text-violet-900 dark:text-violet-100', descText: 'text-violet-700 dark:text-violet-300' },
  hook:      { bg: 'bg-amber-100 dark:bg-amber-900/50',   border: 'border-amber-300 dark:border-amber-600',   nameText: 'text-amber-900 dark:text-amber-100',   descText: 'text-amber-700 dark:text-amber-300' },
  api:       { bg: 'bg-emerald-100 dark:bg-emerald-900/50', border: 'border-emerald-300 dark:border-emerald-600', nameText: 'text-emerald-900 dark:text-emerald-100', descText: 'text-emerald-700 dark:text-emerald-300' },
  database:  { bg: 'bg-rose-100 dark:bg-rose-900/50',     border: 'border-rose-300 dark:border-rose-600',     nameText: 'text-rose-900 dark:text-rose-100',    descText: 'text-rose-700 dark:text-rose-300' },
};

/** Deterministic HSL color derived from a module name — stable across renders/uploads. */
export function moduleColor(mod: string): string {
  let hash = 0;
  for (let i = 0; i < mod.length; i++) hash = (hash * 31 + mod.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

export type ViewMode = 'simple' | 'technical';

/** Context that propagates the current view mode (simple/technical) to DiagramNode. */
export const ViewModeContext = createContext<ViewMode>('simple');

export interface FlowNodeData extends Record<string, unknown> {
  name:         string;
  path:         string;
  module:       string;
  category:     GraphCategory;
  description?: string;
}

/**
 * Longest-path leveling with a bounded iteration count so cyclic navigation
 * graphs (A → B → A) still terminate with a usable, if imperfect, layout —
 * this is a layout heuristic, not a correctness requirement.
 */
export function computeLevels(nodeIds: string[], edges: { source: string; target: string }[]): Map<string, number> {
  const level = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const cap = nodeIds.length + 1;
  for (let iter = 0; iter < cap; iter++) {
    let changed = false;
    for (const e of edges) {
      if (!level.has(e.source) || !level.has(e.target)) continue;
      const candidate = level.get(e.source)! + 1;
      if (level.get(e.target)! < candidate) {
        level.set(e.target, candidate);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return level;
}

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
  data: FlowNodeData;
}

const ROW_HEIGHT = 92;
const MODULE_GAP = 28;
const COL_WIDTH  = 280;

/** Layout for Aba 1 — group nodes by computed level (x) then by module (y, with a gap between module clusters). */
export function layoutByLevel(nodes: { id: string; data: FlowNodeData }[], edges: { source: string; target: string }[]): PositionedNode[] {
  const levels = computeLevels(nodes.map((n) => n.id), edges);
  const byLevel = new Map<number, typeof nodes>();
  for (const n of nodes) {
    const lvl = levels.get(n.id) ?? 0;
    const list = byLevel.get(lvl) ?? [];
    list.push(n);
    byLevel.set(lvl, list);
  }

  const result: PositionedNode[] = [];
  for (const [lvl, list] of byLevel) {
    list.sort((a, b) => a.data.module.localeCompare(b.data.module) || a.data.name.localeCompare(b.data.name));
    let y = 0;
    let prevModule: string | null = null;
    for (const n of list) {
      if (prevModule !== null && prevModule !== n.data.module) y += MODULE_GAP;
      result.push({ id: n.id, x: lvl * COL_WIDTH, y, data: n.data });
      y += ROW_HEIGHT;
      prevModule = n.data.module;
    }
  }
  return result;
}

const CATEGORY_COLUMN: Record<GraphCategory, number> = {
  page: 0, component: 1, hook: 2, api: 2, database: 3,
};

/** Layout for Aba 2 — fixed columns per category (Pages → Components → Hooks/APIs → Database), rows grouped by module. */
export function layoutByCategory(nodes: { id: string; data: FlowNodeData }[]): PositionedNode[] {
  const byCol = new Map<number, typeof nodes>();
  for (const n of nodes) {
    const col = CATEGORY_COLUMN[n.data.category];
    const list = byCol.get(col) ?? [];
    list.push(n);
    byCol.set(col, list);
  }

  const result: PositionedNode[] = [];
  for (const [col, list] of byCol) {
    list.sort((a, b) => a.data.module.localeCompare(b.data.module) || a.data.category.localeCompare(b.data.category) || a.data.name.localeCompare(b.data.name));
    let y = 0;
    let prevModule: string | null = null;
    for (const n of list) {
      if (prevModule !== null && prevModule !== n.data.module) y += MODULE_GAP;
      result.push({ id: n.id, x: col * COL_WIDTH, y, data: n.data });
      y += ROW_HEIGHT;
      prevModule = n.data.module;
    }
  }
  return result;
}
