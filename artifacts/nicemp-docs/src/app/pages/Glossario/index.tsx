import React from 'react';
import { BookOpen } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import { GLOSSARY_TERMS } from '@/app/components/docs';

/**
 * Glossário — lists every term from glossary.ts at once, in plain
 * Portuguese, for non-technical stakeholders who'd rather read everything
 * in one place than hunt for the "?" hints spread across the site.
 */
export default function Glossario() {
  return (
    <div className="w-full">
      <PageHeader
        title="Glossário"
        description="Explicação, em português simples, dos termos técnicos usados neste site."
        badge={`${GLOSSARY_TERMS.length} termos`}
        badgeVariant="info"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {GLOSSARY_TERMS.map(({ termo, explicacao }) => (
          <div
            key={termo}
            className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">{termo}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{explicacao}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
