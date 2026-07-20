import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, StickyNote } from 'lucide-react';
import type { PageEntity, ComponentEntity, ImportEdgeEntity } from '@/services/storage/types';
import { AnnotationRepository } from '@/services/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionItem {
  /** ComponentEntity id if matched, otherwise the raw toPath. */
  id:          string;
  name:        string;
  description: string;
  path:        string;
}

interface Props {
  pages:        PageEntity[];
  components:   ComponentEntity[];
  importEdges:  ImportEdgeEntity[];
  selectedModule: string;
}

const ALL_MODULES = '__all__';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Last path segment without extension — fallback when no ComponentEntity matches. */
function pathDisplayName(filePath: string): string {
  const seg = filePath.split('/').pop() ?? filePath;
  return seg.replace(/\.(tsx?|jsx?|vue|svelte)$/, '');
}

// ─── Annotation field ─────────────────────────────────────────────────────────

interface AnnotationFieldProps {
  entityType: 'page' | 'component';
  entityId:   string;
  initialNote: string;
}

function AnnotationField({ entityType, entityId, initialNote }: AnnotationFieldProps) {
  const [value, setValue] = useState(initialNote);
  const [saved, setSaved]  = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initialNote when the parent re-renders (e.g. page changes)
  useEffect(() => {
    setValue(initialNote);
    setSaved(true);
  }, [initialNote, entityId]);

  const persist = useCallback((note: string) => {
    AnnotationRepository.save(entityType, entityId, note);
    setSaved(true);
  }, [entityType, entityId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const note = e.target.value;
    setValue(note);
    setSaved(false);
    // Debounce: save 800 ms after the last keystroke
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(note), 800);
  };

  const handleBlur = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    persist(value);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-1.5 mb-1.5">
        <StickyNote className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Anotação
        </span>
        {!saved && (
          <span className="text-[10px] text-amber-500 ml-auto">salvando…</span>
        )}
        {saved && value && (
          <span className="text-[10px] text-emerald-500 ml-auto">salvo</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Escreva uma observação sobre esta página…"
        rows={2}
        className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition"
      />
    </div>
  );
}

// ─── Single page card ─────────────────────────────────────────────────────────

interface PageCardProps {
  page:       PageEntity;
  sections:   SectionItem[];
  annotation: string;
}

function PageCard({ page, sections, annotation }: PageCardProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 shadow-sm overflow-hidden">
      {/* ── Page header ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-colors"
        aria-expanded={open}
      >
        <span className="mt-1 shrink-0 text-blue-400">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-blue-900 dark:text-blue-100 leading-tight truncate">
            {page.name}
          </p>
          {page.description ? (
            <p className="mt-0.5 text-sm text-blue-700 dark:text-blue-300 leading-snug">
              {page.description}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-blue-400 dark:text-blue-500 italic">
              Sem descrição gerada ainda.
            </p>
          )}
        </div>
        {sections.length > 0 && (
          <span className="shrink-0 mt-1 text-[11px] font-medium text-blue-400 dark:text-blue-500">
            {sections.length} {sections.length === 1 ? 'seção' : 'seções'}
          </span>
        )}
      </button>

      {/* ── Expanded body ── */}
      {open && (
        <div className="px-5 pb-5">
          {/* Sections list */}
          {sections.length > 0 ? (
            <div className="flex flex-col gap-2 mb-1">
              {sections.map((sec) => (
                <div
                  key={sec.id}
                  className="flex items-start gap-2 rounded-lg bg-white dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-3 py-2.5"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                      {sec.name}
                    </span>
                    {sec.description ? (
                      <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                        — {sec.description}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-blue-400 dark:text-blue-500 italic mb-1">
              Nenhum componente de primeiro nível detectado.
            </p>
          )}

          {/* Annotation */}
          <AnnotationField
            entityType="page"
            entityId={page.id}
            initialNote={annotation}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * PageMapView — Visão Simples do Organograma.
 *
 * Renders a vertical list of expandable page cards. Each card shows:
 *   • Page name + description
 *   • Ordered list of first-level components/sections with their descriptions
 *   • Editable annotation field (persisted via AnnotationRepository)
 *
 * No graph, no ReactFlow. Designed for non-technical stakeholders.
 */
export default function PageMapView({ pages, components, importEdges, selectedModule }: Props) {
  // Build a path → ComponentEntity index for O(1) lookups
  const componentByPath = useMemo(() => {
    const map = new Map<string, ComponentEntity>();
    for (const c of components) map.set(c.location, c);
    return map;
  }, [components]);

  // Load all annotations once on mount
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  useEffect(() => {
    const all = AnnotationRepository.findAll();
    const byId: Record<string, string> = {};
    for (const a of all) {
      if (a.entityType === 'page') byId[a.entityId] = a.note;
    }
    setAnnotations(byId);
  }, []);

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
    <div className="flex flex-col gap-4">
      {filtered.map((page) => {
        // First-level component edges (deduplicated by toPath)
        const seen = new Set<string>();
        const sections: SectionItem[] = [];
        for (const edge of importEdges) {
          if (edge.fromPath !== page.location) continue;
          if (edge.toCategory !== 'component') continue;
          if (seen.has(edge.toPath)) continue;
          seen.add(edge.toPath);

          const comp = componentByPath.get(edge.toPath);
          sections.push({
            id:          comp?.id ?? edge.toPath,
            name:        comp?.name ?? pathDisplayName(edge.toPath),
            description: comp?.description ?? '',
            path:        edge.toPath,
          });
        }

        return (
          <PageCard
            key={page.id}
            page={page}
            sections={sections}
            annotation={annotations[page.id] ?? ''}
          />
        );
      })}
    </div>
  );
}
