/**
 * buildAssistantContext
 *
 * Builds a compact, plain-text summary of the currently loaded project for
 * use as context in AI assistant requests. Reads synchronously from
 * localStorage repositories — no async, no side effects.
 *
 * Format:
 *   Projeto: <name>
 *   Tecnologias: <list>
 *   Módulos (<n> total):
 *   - <module>: <p> páginas, <c> componentes, <h> hooks, <a> APIs, <t> tabelas
 *   ...
 */

import { ProjectRepository } from '@/services/storage/repositories/VersionRepository';
import {
  PageRepository,
  ComponentRepository,
  HookRepository,
  ApiRepository,
  TableRepository,
} from '@/services/storage/repositories/DocumentationRepository';
import { StorageService } from '@/services/storage/StorageService';
import type { TechnologyEntity } from '@/services/storage/types';

export interface AssistantContext {
  projectName: string;
  summary: string;
}

/** Returns undefined when no project is loaded yet. */
export function buildAssistantContext(): AssistantContext | undefined {
  const project = ProjectRepository.findLatest();
  if (!project) return undefined;

  const pid = project.id;

  // ── Gather entity counts per module ──────────────────────────────────────
  const pages      = PageRepository.findByProject(pid);
  const components = ComponentRepository.findByProject(pid);
  const hooks      = HookRepository.findByProject(pid);
  const apis       = ApiRepository.findByProject(pid);
  const tables     = TableRepository.findByProject(pid);

  // Collect all distinct modules
  const allModules = new Set<string>([
    ...pages.map((e) => e.module),
    ...components.map((e) => e.module),
    ...hooks.map((e) => e.module),
    ...apis.map((e) => e.module),
    ...tables.map((e) => e.module),
  ]);

  const moduleLines: string[] = [];
  for (const mod of [...allModules].sort()) {
    if (!mod) continue;
    const p = pages.filter((e) => e.module === mod).length;
    const c = components.filter((e) => e.module === mod).length;
    const h = hooks.filter((e) => e.module === mod).length;
    const a = apis.filter((e) => e.module === mod).length;
    const t = tables.filter((e) => e.module === mod).length;
    const parts: string[] = [];
    if (p) parts.push(`${p} ${p === 1 ? 'página' : 'páginas'}`);
    if (c) parts.push(`${c} ${c === 1 ? 'componente' : 'componentes'}`);
    if (h) parts.push(`${h} ${h === 1 ? 'hook' : 'hooks'}`);
    if (a) parts.push(`${a} ${a === 1 ? 'API' : 'APIs'}`);
    if (t) parts.push(`${t} ${t === 1 ? 'tabela' : 'tabelas'}`);
    moduleLines.push(`- ${mod}: ${parts.length ? parts.join(', ') : 'sem entidades'}`);
  }

  // ── Technologies ─────────────────────────────────────────────────────────
  const techs = StorageService.read<TechnologyEntity>('technologies')
    .filter((t) => t.projectId === pid)
    .map((t) => t.name)
    .slice(0, 15); // cap to avoid bloating the prompt

  // ── Assemble summary text ─────────────────────────────────────────────────
  const lines: string[] = [
    `Projeto: ${project.rootName || project.name}`,
  ];

  if (techs.length) {
    lines.push(`Tecnologias: ${techs.join(', ')}`);
  }

  const totalEntities =
    pages.length + components.length + hooks.length + apis.length + tables.length;

  lines.push(
    `Totais: ${pages.length} páginas, ${components.length} componentes, ` +
    `${hooks.length} hooks, ${apis.length} APIs, ${tables.length} tabelas ` +
    `(${totalEntities} entidades)`,
  );

  if (moduleLines.length) {
    lines.push(`\nMódulos (${moduleLines.length}):`);
    lines.push(...moduleLines);
  } else {
    lines.push('Nenhum módulo identificado ainda.');
  }

  return {
    projectName: project.rootName || project.name,
    summary: lines.join('\n'),
  };
}
