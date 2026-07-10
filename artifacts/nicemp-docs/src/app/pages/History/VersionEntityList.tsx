import React from 'react';
import { FileText, Layers, Zap, Globe, Table as TableIcon } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import type { VersionSnapshotEntity, EntitySummary } from '@/services/storage/types';

const GROUPS: { key: keyof Pick<VersionSnapshotEntity, 'pages' | 'components' | 'hooks' | 'apis' | 'tables'>; label: string; icon: React.ElementType }[] = [
  { key: 'pages',      label: 'Páginas',     icon: FileText   },
  { key: 'components', label: 'Componentes', icon: Layers     },
  { key: 'hooks',      label: 'Hooks',       icon: Zap        },
  { key: 'apis',       label: 'APIs',        icon: Globe      },
  { key: 'tables',     label: 'Tabelas',     icon: TableIcon  },
];

function EntityRow({ item }: { item: EntitySummary }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-muted/40 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground truncate font-mono">{item.location}</p>
      </div>
      {item.module && (
        <Badge variant="outline" className="shrink-0 text-[10px] font-normal">{item.module}</Badge>
      )}
    </div>
  );
}

/** Read-only listing of every entity captured in a version snapshot — used by the "Abrir versão" panel. */
export default function VersionEntityList({ snapshot }: { snapshot: VersionSnapshotEntity }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {GROUPS.map(({ key, label, icon: Icon }) => {
        const items = snapshot[key];
        return (
          <div key={key} className="rounded-lg border border-border bg-background/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
              <Badge variant="outline" className="ml-auto text-[10px] font-normal">{items.length}</Badge>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-1">Nenhum registro.</p>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {items.map((item) => <EntityRow key={item.id} item={item} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
