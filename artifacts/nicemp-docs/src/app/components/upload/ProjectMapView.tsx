import React, { useState } from 'react';
import {
  Cpu, Layers, Palette, Server, Database, TestTube2, Wrench,
  Terminal, ChevronRight, ChevronDown, File, Folder, FolderOpen,
  Package, GitBranch, Hash,
} from 'lucide-react';
import { cn } from '@/utils';
import { CATEGORY_LABELS } from '@/services/engine';
import type { ProjectMap, DirectoryNode, TechnologyProfile, FileCategory } from '@/services/engine';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const CATEGORY_COLORS: Partial<Record<FileCategory, string>> = {
  page:       'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  component:  'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  hook:       'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
  context:    'bg-teal-500/15 text-teal-700 dark:text-teal-400',
  layout:     'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  provider:   'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  route:      'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  api:        'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  database:   'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  schema:     'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  script:     'bg-lime-500/15 text-lime-700 dark:text-lime-400',
  config:     'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  asset:      'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  style:      'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  test:       'bg-red-500/15 text-red-700 dark:text-red-400',
  other:      'bg-muted text-muted-foreground',
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function MapSection({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5 bg-muted/30">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Tech badge ───────────────────────────────────────────────────────────────

function TechBadge({ name, version }: { name: string; version?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
      {name}
      {version && <span className="text-muted-foreground">{version}</span>}
    </span>
  );
}

// ─── Technology profile ───────────────────────────────────────────────────────

const TECH_GROUPS: Array<{
  key: keyof TechnologyProfile;
  label: string;
  icon: React.ElementType;
}> = [
  { key: 'languages',  label: 'Linguagens',     icon: Hash       },
  { key: 'frameworks', label: 'Frameworks',      icon: Layers     },
  { key: 'styling',    label: 'Estilização',     icon: Palette    },
  { key: 'backend',    label: 'Backend',         icon: Server     },
  { key: 'database',   label: 'Banco de Dados',  icon: Database   },
  { key: 'testing',    label: 'Testes',          icon: TestTube2  },
  { key: 'buildTools', label: 'Build',           icon: Wrench     },
  { key: 'runtime',    label: 'Runtime / PM',    icon: Terminal   },
];

function TechProfile({ tech }: { tech: TechnologyProfile }) {
  const groups = TECH_GROUPS.filter((g) => tech[g.key].length > 0);
  if (groups.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma tecnologia detectada.</p>;

  return (
    <div className="space-y-3">
      {groups.map(({ key, label, icon: Icon }) => (
        <div key={key} className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 w-36 shrink-0 mt-1">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tech[key].map((t) => <TechBadge key={t.name} name={t.name} version={t.version} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Category breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ stats }: { stats: ProjectMap['stats'] }) {
  const entries = (Object.entries(stats.byCategory) as [FileCategory, number][])
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a);

  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map(([cat, count]) => (
        <div
          key={cat}
          className={cn(
            'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium',
            CATEGORY_COLORS[cat] ?? 'bg-muted text-muted-foreground',
          )}
        >
          <span className="truncate">{CATEGORY_LABELS[cat]}</span>
          <span className="ml-2 font-bold tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Directory tree ───────────────────────────────────────────────────────────

function TreeNode({ node, depth = 0 }: { node: DirectoryNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0 || node.files.length > 0;

  if (node.name === '.') {
    return (
      <div className="space-y-0.5">
        {node.children.map((c) => <TreeNode key={c.path} node={c} depth={0} />)}
        {node.files.map((f) => (
          <div key={f.path} style={{ paddingLeft: 0 }} className="flex items-center gap-1.5 py-0.5 text-xs text-muted-foreground">
            <File className="h-3 w-3 shrink-0" />
            <span className="truncate font-mono">{f.name}</span>
            <span className={cn('ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', CATEGORY_COLORS[f.category] ?? 'bg-muted text-muted-foreground')}>
              {CATEGORY_LABELS[f.category]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <button
        type="button"
        onClick={() => hasChildren && setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 py-0.5 text-left text-xs hover:text-foreground text-muted-foreground transition-colors group"
      >
        {open
          ? <ChevronDown className="h-3 w-3 shrink-0" />
          : <ChevronRight className="h-3 w-3 shrink-0" />}
        {open
          ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
        <span className="font-mono font-medium text-foreground group-hover:text-primary transition-colors">{node.name}</span>
        <span className="ml-1 text-[10px] text-muted-foreground/60">({node.totalFiles})</span>
      </button>

      {open && (
        <div>
          {node.children.map((c) => <TreeNode key={c.path} node={c} depth={depth + 1} />)}
          {node.files.map((f) => (
            <div
              key={f.path}
              style={{ paddingLeft: (depth + 1) * 12 + 20 }}
              className="flex items-center gap-1.5 py-0.5 text-xs text-muted-foreground"
            >
              <File className="h-3 w-3 shrink-0 opacity-60" />
              <span className="truncate font-mono">{f.name}</span>
              <span className={cn('ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', CATEGORY_COLORS[f.category] ?? 'bg-muted text-muted-foreground')}>
                {CATEGORY_LABELS[f.category]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Dependencies list ────────────────────────────────────────────────────────

function DepList({ map }: { map: ProjectMap }) {
  const prod = map.dependencies.dependencies.slice(0, 20);
  const dev  = map.dependencies.devDependencies.slice(0, 20);

  if (prod.length === 0 && dev.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum package.json encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      {prod.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Produção ({map.dependencies.dependencies.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {prod.map((d) => (
              <span key={d.name} className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-xs font-mono text-foreground">
                {d.name}
                <span className="text-muted-foreground">{d.version}</span>
              </span>
            ))}
            {map.dependencies.dependencies.length > 20 && (
              <span className="text-xs text-muted-foreground self-center">
                +{map.dependencies.dependencies.length - 20} mais
              </span>
            )}
          </div>
        </div>
      )}
      {dev.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Dev ({map.dependencies.devDependencies.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {dev.map((d) => (
              <span key={d.name} className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                {d.name}
                <span className="opacity-60">{d.version}</span>
              </span>
            ))}
            {map.dependencies.devDependencies.length > 20 && (
              <span className="text-xs text-muted-foreground self-center">
                +{map.dependencies.devDependencies.length - 20} mais
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectMapView({ map }: { map: ProjectMap }) {
  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Projeto',    value: map.rootName,                       icon: Package   },
          { label: 'Arquivos',   value: String(map.stats.totalFiles),        icon: File      },
          { label: 'Tamanho',    value: fmt(map.stats.totalSizeBytes),       icon: Cpu       },
          { label: 'Analisado',  value: fmtDate(map.analyzedAt),             icon: GitBranch },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Technology stack */}
      <MapSection title="Stack Tecnológico" icon={Cpu}>
        <TechProfile tech={map.technology} />
      </MapSection>

      {/* File categories */}
      <MapSection title="Mapa de Arquivos" icon={Layers}>
        <CategoryBreakdown stats={map.stats} />
      </MapSection>

      {/* Directory tree */}
      <MapSection title="Estrutura de Diretórios" icon={Folder}>
        <div className="max-h-80 overflow-y-auto pr-2 font-mono">
          <TreeNode node={map.tree} depth={0} />
        </div>
      </MapSection>

      {/* Dependencies */}
      <MapSection title="Dependências" icon={Package}>
        <DepList map={map} />
      </MapSection>
    </div>
  );
}
