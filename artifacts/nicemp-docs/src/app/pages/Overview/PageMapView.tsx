/**
 * PageMapView — "Visão Simples" do Organograma.
 *
 * Renderiza as páginas do projeto como um mapa de site em árvore, agrupadas
 * por módulo em faixas com cabeçalho colorido. Dentro de cada faixa um layout
 * hierárquico (dagre top-down) organiza as páginas conectadas por navegação,
 * minimizando cruzamento de linhas. Cada card mostra nome amigável + descrição.
 *
 * Features:
 *   • Module bands — cabeçalho colorido por módulo, fundo levemente tintado
 *   • Cards com nome + descrição; hover mostra o caminho do arquivo
 *   • Clique expande: componentes de primeiro nível + campo de anotação
 *   • SVG arrows para conexões de navegação dentro de cada módulo
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dagre from '@dagrejs/dagre';
import { ChevronDown, ChevronRight, StickyNote } from 'lucide-react';
import type {
  PageEntity,
  ComponentEntity,
  ImportEdgeEntity,
  InteractionEntity,
} from '@/services/storage/types';
import { AnnotationRepository } from '@/services/storage';
import { matchPageByPath } from '@/services/exploration/urlMatch';
import { moduleColor } from './diagramUtils';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_W    = 224;
const CARD_H    = 88;
const RANK_SEP  = 60;
const NODE_SEP  = 28;
const MARGIN    = 20;
const NAV_PREFIX = 'navega para ';
const ALL_MODULES = '__all__';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavEdge {
  sourceId: string;
  targetId: string;
  label:    string;
}

interface PositionedPage {
  page: PageEntity;
  x:    number; // top-left x in canvas coords
  y:    number; // top-left y in canvas coords
}

interface SectionItem {
  id:          string;
  name:        string;
  description: string;
  path:        string;
}

interface Props {
  pages:          PageEntity[];
  components:     ComponentEntity[];
  importEdges:    ImportEdgeEntity[];
  interactions:   InteractionEntity[];
  selectedModule: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize a file path: collapse slashes, strip leading ./ */
function normPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

/** Human-readable name from a file path (last segment, no extension). */
function pathDisplayName(filePath: string): string {
  const seg = filePath.split('/').pop() ?? filePath;
  return seg.replace(/\.(tsx?|jsx?|vue|svelte)$/, '');
}

/**
 * Run dagre layout and return absolute card positions (top-left corner).
 * Pages with no edges are still included as isolated nodes.
 */
function computeLayout(pages: PageEntity[], edges: NavEdge[]): PositionedPage[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: MARGIN,
    marginy: MARGIN,
  });

  for (const p of pages) {
    g.setNode(p.id, { width: CARD_W, height: CARD_H });
  }

  const pageIdSet = new Set(pages.map((p) => p.id));
  for (const e of edges) {
    if (pageIdSet.has(e.sourceId) && pageIdSet.has(e.targetId) && e.sourceId !== e.targetId) {
      g.setEdge(e.sourceId, e.targetId);
    }
  }

  dagre.layout(g);

  return pages.map((p) => {
    const node = g.node(p.id);
    return {
      page: p,
      x: node.x - CARD_W / 2,
      y: node.y - CARD_H / 2,
    };
  });
}

/** SVG cubic bezier: bottom-center of source → top-center of target. */
function edgePath(sx: number, sy: number, tx: number, ty: number): string {
  const srcX = sx + CARD_W / 2;
  const srcY = sy + CARD_H;
  const tgtX = tx + CARD_W / 2;
  const tgtY = ty;
  const mid  = (srcY + tgtY) / 2;
  return `M ${srcX} ${srcY} C ${srcX} ${mid}, ${tgtX} ${mid}, ${tgtX} ${tgtY}`;
}

// ─── AnnotationField ──────────────────────────────────────────────────────────

interface AnnotationFieldProps {
  entityType:  'page' | 'component';
  entityId:    string;
  initialNote: string;
}

function AnnotationField({ entityType, entityId, initialNote }: AnnotationFieldProps) {
  const [value, setValue]  = useState(initialNote);
  const [saved, setSaved]  = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setValue(initialNote); setSaved(true); }, [initialNote, entityId]);

  const persist = useCallback((note: string) => {
    AnnotationRepository.save(entityType, entityId, note);
    setSaved(true);
  }, [entityType, entityId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const note = e.target.value;
    setValue(note);
    setSaved(false);
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
        {!saved && <span className="text-[10px] text-amber-500 ml-auto">salvando…</span>}
        {saved && value && <span className="text-[10px] text-emerald-500 ml-auto">salvo</span>}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Escreva uma observação sobre esta página…"
        rows={2}
        className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition"
      />
    </div>
  );
}

// ─── PageCard ─────────────────────────────────────────────────────────────────

interface PageCardProps {
  page:        PageEntity;
  sections:    SectionItem[];
  annotation:  string;
  accentColor: string;
  style?:      React.CSSProperties;
}

function PageCard({ page, sections, annotation, accentColor, style }: PageCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        ...style,
        width: CARD_W,
        minHeight: CARD_H,
        position: 'absolute',
      }}
      title={`${page.location}`}
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden cursor-default"
    >
      {/* Accent bar */}
      <div style={{ backgroundColor: accentColor, height: 3 }} />

      {/* Header row */}
      <button
        onClick={() => setExpanded((o) => !o)}
        className="w-full flex items-start gap-2 px-3 pt-2 pb-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 shrink-0 text-slate-400">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold leading-tight text-slate-800 dark:text-slate-100 truncate">
            {page.name}
          </p>
          {page.description ? (
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">
              {page.description}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-slate-400 italic">Sem descrição</p>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800">
          <div className="pt-2">
            {sections.length > 0 ? (
              <div className="flex flex-col gap-1">
                {sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="flex items-start gap-1.5 rounded-md bg-slate-50 dark:bg-slate-800 px-2 py-1.5"
                  >
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: accentColor }}
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        {sec.name}
                      </span>
                      {sec.description && (
                        <span className="ml-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          — {sec.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Nenhum componente de primeiro nível detectado.
              </p>
            )}
            <AnnotationField
              entityType="page"
              entityId={page.id}
              initialNote={annotation}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ModuleBand ───────────────────────────────────────────────────────────────

interface ModuleBandProps {
  moduleName:      string;
  pages:           PageEntity[];
  navEdges:        NavEdge[];
  sectionsByPageId: Map<string, SectionItem[]>;
  annotations:     Record<string, string>;
}

function ModuleBand({
  moduleName,
  pages,
  navEdges,
  sectionsByPageId,
  annotations,
}: ModuleBandProps) {
  const color = moduleColor(moduleName);

  const positioned = useMemo(() => computeLayout(pages, navEdges), [pages, navEdges]);

  const canvasW = useMemo(() => {
    const maxRight = positioned.reduce((m, p) => Math.max(m, p.x + CARD_W + MARGIN), 0);
    return Math.max(maxRight, CARD_W + MARGIN * 2);
  }, [positioned]);

  const canvasH = useMemo(() => {
    const maxBottom = positioned.reduce((m, p) => Math.max(m, p.y + CARD_H + MARGIN), 0);
    return Math.max(maxBottom, CARD_H + MARGIN * 2);
  }, [positioned]);

  const posById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const p of positioned) map.set(p.page.id, { x: p.x, y: p.y });
    return map;
  }, [positioned]);

  const pageIdSet = useMemo(() => new Set(pages.map((p) => p.id)), [pages]);

  const intraEdges = useMemo(
    () => navEdges.filter((e) => pageIdSet.has(e.sourceId) && pageIdSet.has(e.targetId)),
    [navEdges, pageIdSet],
  );

  const markerId = `arrow-${moduleName.replace(/[^a-z0-9]/gi, '_')}`;

  return (
    <div
      className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      {/* Module header — rounded-t so background is clipped to corners without
          needing overflow-hidden on the outer wrapper (which would clip expanded cards) */}
      <div
        className="px-4 py-2.5 flex items-center gap-2 rounded-t-2xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <span
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span
          className="text-[13px] font-bold tracking-wide capitalize"
          style={{ color }}
        >
          {moduleName}
        </span>
        <span className="text-[11px] text-slate-400 ml-auto">
          {pages.length} {pages.length === 1 ? 'página' : 'páginas'}
        </span>
      </div>

      {/* Tree canvas — minHeight (not fixed height) so expanded cards are never clipped */}
      <div
        className="relative bg-white/60 dark:bg-slate-900/40"
        style={{ width: canvasW, minHeight: canvasH }}
      >
        {/* SVG connection lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={canvasW}
          height={canvasH}
        >
          <defs>
            <marker
              id={markerId}
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <path d="M 0 0 L 7 3.5 L 0 7 z" fill={color} opacity={0.55} />
            </marker>
          </defs>
          {intraEdges.map((e, idx) => {
            const src = posById.get(e.sourceId);
            const tgt = posById.get(e.targetId);
            if (!src || !tgt) return null;
            return (
              <path
                key={idx}
                d={edgePath(src.x, src.y, tgt.x, tgt.y)}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeOpacity={0.45}
                markerEnd={`url(#${markerId})`}
              />
            );
          })}
        </svg>

        {/* Page cards */}
        {positioned.map(({ page, x, y }) => (
          <PageCard
            key={page.id}
            page={page}
            sections={sectionsByPageId.get(page.id) ?? []}
            annotation={annotations[page.id] ?? ''}
            accentColor={color}
            style={{ left: x, top: y }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PageMapView({
  pages,
  components,
  importEdges,
  interactions,
  selectedModule,
}: Props) {
  // Component lookup by normalized path
  const componentByPath = useMemo(() => {
    const map = new Map<string, ComponentEntity>();
    for (const c of components) map.set(normPath(c.location), c);
    return map;
  }, [components]);

  // First-level sections per page — normalized path comparison to fix the
  // "Nenhum componente de primeiro nível detectado" bug where strict string
  // equality was failing on minor path format differences.
  const sectionsByPageId = useMemo(() => {
    const result = new Map<string, SectionItem[]>();

    // Index edges by normalized fromPath for O(1) lookup
    const edgesByFrom = new Map<string, ImportEdgeEntity[]>();
    for (const edge of importEdges) {
      if (edge.fromCategory !== 'page') continue;
      const key = normPath(edge.fromPath);
      const list = edgesByFrom.get(key) ?? [];
      list.push(edge);
      edgesByFrom.set(key, list);
    }

    for (const page of pages) {
      const seen = new Set<string>();
      const sections: SectionItem[] = [];
      const edges = edgesByFrom.get(normPath(page.location)) ?? [];

      for (const edge of edges) {
        if (edge.toCategory !== 'component') continue;
        const toNorm = normPath(edge.toPath);
        if (seen.has(toNorm)) continue;
        seen.add(toNorm);
        const comp = componentByPath.get(toNorm);
        sections.push({
          id:          comp?.id ?? edge.toPath,
          name:        comp?.name ?? pathDisplayName(edge.toPath),
          description: comp?.description ?? '',
          path:        edge.toPath,
        });
      }
      result.set(page.id, sections);
    }
    return result;
  }, [pages, importEdges, componentByPath]);

  // Navigation edges from interactions
  const navEdges = useMemo((): NavEdge[] => {
    const map = new Map<string, NavEdge>();
    for (const interaction of interactions) {
      if (!interaction.apiHint.startsWith(NAV_PREFIX)) continue;
      const srcPage = pages.find(
        (p) => normPath(p.location) === normPath(interaction.location),
      );
      if (!srcPage) continue;
      const targetRoute = interaction.apiHint.slice(NAV_PREFIX.length).trim();
      if (!targetRoute) continue;
      const match = matchPageByPath(targetRoute, pages);
      const tgtPage = match.exact ?? match.suggestions[0]?.page;
      if (!tgtPage || tgtPage.id === srcPage.id) continue;
      const key = `${srcPage.id}=>${tgtPage.id}`;
      const existing = map.get(key);
      const label = interaction.label || interaction.handlerName || 'ação';
      if (existing) existing.label += ` · ${label}`;
      else map.set(key, { sourceId: srcPage.id, targetId: tgtPage.id, label });
    }
    return [...map.values()];
  }, [interactions, pages]);

  // Annotations
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  useEffect(() => {
    const all = AnnotationRepository.findAll();
    const byId: Record<string, string> = {};
    for (const a of all) {
      if (a.entityType === 'page') byId[a.entityId] = a.note;
    }
    setAnnotations(byId);
  }, []);

  // Filter + group by module
  const filtered = selectedModule === ALL_MODULES
    ? pages
    : pages.filter((p) => p.module === selectedModule);

  const byModule = useMemo(() => {
    const map = new Map<string, PageEntity[]>();
    for (const p of filtered) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
        Nenhuma página encontrada para este filtro.
      </div>
    );
  }

  const sortedModules = [...byModule.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-wrap gap-5 overflow-x-auto pb-4">
      {sortedModules.map((mod) => (
        <ModuleBand
          key={mod}
          moduleName={mod}
          pages={byModule.get(mod)!}
          navEdges={navEdges}
          sectionsByPageId={sectionsByPageId}
          annotations={annotations}
        />
      ))}
    </div>
  );
}
