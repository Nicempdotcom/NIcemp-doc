import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/app/components/ui/input';

interface EntityTableToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  resultCount: number;
  totalCount: number;
}

/** Shared search box + result count used above every auto-generated entity table (EPIC 08). */
export default function EntityTableToolbar({ query, onQueryChange, placeholder, resultCount, totalCount }: EntityTableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder ?? 'Buscar por nome...'}
          className="pl-8 h-9"
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {resultCount === totalCount ? `${totalCount} registro(s)` : `${resultCount} de ${totalCount} registro(s)`}
      </span>
    </div>
  );
}
