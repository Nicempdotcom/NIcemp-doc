import React from 'react';
import type { PageEntity, ImportEdgeEntity } from '@/services/storage/types';

interface Props {
  pages: PageEntity[];
  importEdges: ImportEdgeEntity[];
  selectedModule: string;
}

const ALL_MODULES = '__all__';

/** Extract a human-readable display name from a file path (last segment, no extension). */
function displayName(filePath: string): string {
  const segment = filePath.split('/').pop() ?? filePath;
  return segment.replace(/\.(tsx?|jsx?|vue|svelte)$/, '');
}

/**
 * Visão Simples — renders every PageEntity as a plain card showing:
 *   • Friendly page name
 *   • One-line description
 *   • "Contém:" list of first-level component names (direct imports only)
 *
 * No graph, no edges, no ReactFlow. Just readable cards for non-technical users.
 */
export default function PageCardList({ pages, importEdges, selectedModule }: Props) {
  const filtered = selectedModule === ALL_MODULES
    ? pages
    : pages.filter((p) => p.module === selectedModule);

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
        Nenhuma página encontrada para este filtro.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map((page) => {
        // First-level components: edges that leave this page and arrive at a component
        const directComponents = importEdges
          .filter((e) => e.fromPath === page.location && e.toCategory === 'component')
          .map((e) => displayName(e.toPath));

        // Deduplicate (same component can be imported multiple times)
        const uniqueComponents = [...new Set(directComponents)];

        return (
          <div
            key={page.id}
            className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 px-5 py-4 flex flex-col gap-2 shadow-sm"
          >
            {/* Page name */}
            <p className="text-base font-bold text-blue-900 dark:text-blue-100 leading-tight">
              {page.name}
            </p>

            {/* Description */}
            {page.description ? (
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-snug">
                {page.description}
              </p>
            ) : (
              <p className="text-sm text-blue-400 dark:text-blue-600 italic">
                Sem descrição gerada ainda.
              </p>
            )}

            {/* First-level components */}
            {uniqueComponents.length > 0 && (
              <div className="mt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400">
                  Contém
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {uniqueComponents.map((comp) => (
                    <span
                      key={comp}
                      className="inline-block rounded-md bg-white dark:bg-blue-900/60 border border-blue-200 dark:border-blue-700 px-2 py-0.5 text-[11px] font-medium text-blue-800 dark:text-blue-200"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
