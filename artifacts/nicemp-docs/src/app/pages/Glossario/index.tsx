import React, { useState, useMemo } from 'react';
import { BookOpen, Search } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import { Section } from '@/app/components/docs';
import { Input } from '@/app/components/ui/input';
import { GLOSSARY_ITEMS, type GlossaryEntry } from '@/app/components/docs/glossary';

const CATEGORIES: { key: GlossaryEntry['categoria']; title: string; description: string }[] = [
  { key: 'tela',          title: 'Telas da plataforma',       description: 'O que cada tela do NicEmp Docs faz e pra que serve.' },
  { key: 'conceito',      title: 'Conceitos gerais',          description: 'Os termos técnicos mais comuns, explicados sem jargão.' },
  { key: 'indicador',     title: 'Como ler os indicadores',   description: 'Status, níveis de risco, versões e outros sinais que aparecem pelas telas.' },
  { key: 'documentacao',  title: 'Seções de documentação',    description: 'O que cada seção dentro de "Documentação" cobre.' },
];

function TermCard({ termo, explicacao }: { termo: string; explicacao: string }) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground">{termo}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{explicacao}</p>
    </div>
  );
}

/**
 * Glossário — lista todos os termos e telas do NicEmp Docs agrupados por
 * categoria, com busca em tempo real, para que não-técnicos encontrem
 * rapidamente o que cada coisa significa.
 */
export default function Glossario() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GLOSSARY_ITEMS;
    return GLOSSARY_ITEMS.filter(
      (e) =>
        e.termo.toLowerCase().includes(q) ||
        e.explicacao.toLowerCase().includes(q),
    );
  }, [query]);

  const byCategory = useMemo(() => {
    const map = new Map<GlossaryEntry['categoria'], GlossaryEntry[]>();
    for (const entry of filtered) {
      const list = map.get(entry.categoria) ?? [];
      list.push(entry);
      map.set(entry.categoria, list);
    }
    return map;
  }, [filtered]);

  const totalFiltered = filtered.length;

  return (
    <div className="w-full">
      <PageHeader
        title="Glossário"
        description="Explicação, em português simples, de todos os termos, indicadores e telas do NicEmp Docs."
        badge={`${GLOSSARY_ITEMS.length} termos`}
        badgeVariant="info"
      />

      {/* Search */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por termo ou explicação…"
            className="pl-9"
          />
        </div>
        {query && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {totalFiltered === 0
              ? 'Nenhum termo encontrado.'
              : `${totalFiltered} termo${totalFiltered !== 1 ? 's' : ''} encontrado${totalFiltered !== 1 ? 's' : ''}.`}
          </p>
        )}
      </div>

      {totalFiltered === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum resultado para "{query}".</p>
      )}

      {CATEGORIES.map(({ key, title, description }) => {
        const items = byCategory.get(key);
        if (!items || items.length === 0) return null;
        return (
          <Section key={key} title={title} description={description}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map(({ termo, explicacao }) => (
                <TermCard key={termo} termo={termo} explicacao={explicacao} />
              ))}
            </div>
          </Section>
        );
      })}
    </div>
  );
}
