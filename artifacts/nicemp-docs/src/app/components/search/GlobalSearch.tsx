import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Layers, Zap, Globe, Table as TableIcon, Package, FolderKanban,
} from 'lucide-react';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from '@/app/components/ui/command';
import { SearchIndex, KIND_LABELS, type SearchResultKind } from '@/services/search/SearchIndex';

const KIND_ICONS: Record<SearchResultKind, React.ElementType> = {
  project:    FolderKanban,
  page:       FileText,
  component:  Layers,
  hook:       Zap,
  api:        Globe,
  table:      TableIcon,
  dependency: Package,
};

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Pesquisa Global (⌘K) — searches every entity in the documentation database
 * (projects, pages, components, hooks, APIs, tables, dependencies) and
 * navigates straight to where it's rendered (EPIC 08 Portal Oficial).
 */
export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const index = useMemo(() => SearchIndex.build(), [open]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResultKind, typeof index>();
    for (const item of index) {
      const list = map.get(item.kind) ?? [];
      list.push(item);
      map.set(item.kind, list);
    }
    return map;
  }, [index]);

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Pesquisar páginas, componentes, hooks, APIs, tabelas, dependências..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {[...grouped.entries()].map(([kind, items]) => {
          const Icon = KIND_ICONS[kind];
          return (
            <CommandGroup key={kind} heading={KIND_LABELS[kind]}>
              {items.map((item) => (
                <CommandItem key={item.id} value={`${item.title} ${item.subtitle}`} onSelect={() => go(item.href)}>
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
