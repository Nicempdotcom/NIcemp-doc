import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Layers, Zap, Globe, Table as TableIcon, GitCompare, ArrowRight } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import { InfoBox } from '@/app/components/docs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  ProjectRepository,
  VersionRepository,
  VersionSnapshotRepository,
} from '@/services/storage';
import { VersionComparator, COMPARISON_CATEGORY_LABELS, type ComparisonCategory } from '@/services/comparison';
import CategorySection from './CategorySection';

const CATEGORY_ICONS: Record<ComparisonCategory, React.ElementType> = {
  pages:      FileText,
  components: Layers,
  hooks:      Zap,
  apis:       Globe,
  tables:     TableIcon,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Comparison() {
  const [searchParams] = useSearchParams();

  const projects = useMemo(() => ProjectRepository.findAll(), []);
  const [projectId, setProjectId] = useState<string>(() => {
    const latest = ProjectRepository.findLatest();
    return latest?.id ?? '';
  });

  const versions = useMemo(
    () => (projectId ? VersionRepository.findByProject(projectId) : []),
    [projectId],
  );

  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId]     = useState<string>('');

  // Initialize / re-sync selection when project or query params change.
  useEffect(() => {
    if (versions.length === 0) {
      setFromId('');
      setToId('');
      return;
    }
    const qFrom = searchParams.get('from');
    const qTo   = searchParams.get('to');
    const validQFrom = qFrom && versions.some((v) => v.id === qFrom) ? qFrom : undefined;
    const validQTo   = qTo && versions.some((v) => v.id === qTo)     ? qTo   : undefined;

    setToId(validQTo ?? versions[0].id);
    setFromId(validQFrom ?? versions[1]?.id ?? versions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, versions.length]);

  const fromSnapshot = fromId ? VersionSnapshotRepository.findByVersion(fromId) : undefined;
  const toSnapshot   = toId   ? VersionSnapshotRepository.findByVersion(toId)   : undefined;

  const result = useMemo(() => {
    if (!fromSnapshot || !toSnapshot) return null;
    return VersionComparator.compare(fromSnapshot, toSnapshot);
  }, [fromSnapshot, toSnapshot]);

  const chips = result ? VersionComparator.buildSummaryChips(result) : [];

  const project = projects.find((p) => p.id === projectId);
  const versionLabel = (id: string) => {
    const v = versions.find((ver) => ver.id === id);
    return v ? formatDate(v.snapshotAt) : id;
  };

  return (
    <div className="w-full">
      <PageHeader
        title="Comparação de Versões"
        description="Veja o que mudou na estrutura do seu projeto entre duas versões analisadas."
        badge="EPIC 05"
        badgeVariant="info"
      />

      {projects.length === 0 && (
        <InfoBox variant="tip" title="Nenhum projeto analisado ainda">
          Envie um arquivo ZIP na tela de Upload para começar a gerar versões comparáveis.
        </InfoBox>
      )}

      {projects.length > 0 && (
        <>
          <div className="bg-card border border-card-border rounded-lg p-5 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Projeto</span>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.rootName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Versão anterior</span>
                <Select value={fromId} onValueChange={setFromId} disabled={versions.length === 0}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{formatDate(v.snapshotAt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Versão atual</span>
                <Select value={toId} onValueChange={setToId} disabled={versions.length === 0}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{formatDate(v.snapshotAt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {versions.length < 2 && (
            <InfoBox variant="tip" title="Apenas uma versão disponível">
              Importe um novo ZIP deste mesmo projeto para gerar uma segunda versão e habilitar a comparação.
            </InfoBox>
          )}

          {versions.length >= 2 && (!fromSnapshot || !toSnapshot) && (
            <InfoBox variant="warning" title="Versão sem snapshot">
              Uma das versões selecionadas foi analisada antes do recurso de comparação existir e não possui
              dados suficientes para o diff. Selecione versões mais recentes.
            </InfoBox>
          )}

          {result && (
            <>
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-6 py-5 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <GitCompare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{project?.rootName}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-1">
                    {versionLabel(fromId)} <ArrowRight className="h-3 w-3" /> {versionLabel(toId)}
                  </span>
                </div>

                {result.isIdentical ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Nenhuma alteração estrutural entre as versões selecionadas.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {chips.map((chip, i) => {
                      const isAdd = chip.startsWith('+');
                      const isRemove = chip.startsWith('-');
                      return (
                        <span
                          key={i}
                          className={
                            'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ' +
                            (isAdd
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : isRemove
                              ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400')
                          }
                        >
                          {chip}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {(Object.keys(COMPARISON_CATEGORY_LABELS) as ComparisonCategory[]).map((category) => (
                  <CategorySection
                    key={category}
                    icon={CATEGORY_ICONS[category]}
                    title={COMPARISON_CATEGORY_LABELS[category].plural.replace(/^\w/, (c) => c.toUpperCase())}
                    diff={result.byCategory[category]}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
