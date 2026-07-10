import React from 'react';
import { FileArchive, Files, FolderOpen, Calendar, HardDrive } from 'lucide-react';
import type { LoadedZip } from '@/features/upload';

interface ZipSummaryProps {
  zip: LoadedZip;
}

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ZipSummary({ zip }: ZipSummaryProps) {
  // Top extensions
  const extMap = new Map<string, number>();
  zip.entries.filter((e) => !e.isDir).forEach((e) => {
    extMap.set(e.ext, (extMap.get(e.ext) ?? 0) + 1);
  });
  const topExts = [...extMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const stats = [
    { icon: HardDrive,  label: 'Tamanho',  value: fmt(zip.sizeByes)       },
    { icon: Files,      label: 'Arquivos', value: String(zip.fileCount)   },
    { icon: FolderOpen, label: 'Pastas',   value: String(zip.dirCount)    },
    { icon: Calendar,   label: 'Lido em',  value: fmtDate(zip.loadedAt)   },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <FileArchive className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{zip.name}</p>
          <p className="text-xs text-muted-foreground">ZIP carregado em memória</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg bg-muted/40 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                {label}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Top extensions */}
      {topExts.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
            Tipos de arquivo
          </p>
          <div className="flex flex-wrap gap-2">
            {topExts.map(([ext, count]) => (
              <span
                key={ext}
                className="inline-flex items-center gap-1 rounded-md bg-primary/8 px-2.5 py-1 text-xs font-mono font-medium text-primary"
              >
                {ext || 'sem ext'}
                <span className="text-primary/60">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
