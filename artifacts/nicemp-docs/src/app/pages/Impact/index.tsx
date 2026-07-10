import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import { InfoBox } from '@/app/components/docs';
import RiskBadge from '@/app/components/docs/RiskBadge';
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
import { VersionComparator } from '@/services/comparison';
import { ImpactAnalyzer, RISK_LABELS, type ImpactEntry } from '@/services/impact/ImpactAnalyzer';
import ImpactCard from '@/app/components/impact/ImpactCard';
import DependencyGraph from '@/app/components/impact/DependencyGraph';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Impact() {
  const [searchParams] = useSearchParams();

  const projects = useMemo(() => ProjectRepository.findAll(), []);
  const [projectId, setProjectId] = useState<string>(() => ProjectRepository.findLatest()?.id ?? '');

  const versions = useMemo(
    () => (projectId ? VersionRepository.findByProject(projectId) : []),
    [projectId],
  );

  const [fromId, setFromId] = useState('');
  const [toId, setToId]     = useState('');
  const [selectedEntry, setSelectedEntry] = useState<ImpactEntry | null>(null);

  useEffect(() => {
    if (versions.length === 0) {
      setFromId('');
      setToId('');
      return;
    }
    const qFrom = searchParams.get('from');
    const qTo   = searchParams.get('to');
    const validFrom = qFrom && versions.some((v) => v.id === qFrom) ? qFrom : undefined;
    const validTo   = qTo && versions.some((v) => v.id === qTo)     ? qTo   : undefined;

    setToId(validTo ?? versions[0].id);
    setFromId(validFrom ?? versions[1]?.id ?? versions[0].id);
    setSelectedEntry(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, versions.length]);

  const fromSnapshot = fromId ? VersionSnapshotRepository.findByVersion(fromId) : undefined;
  const toSnapshot   = toId   ? VersionSnapshotRepository.findByVersion(toId)   : undefined;

  const report = useMemo(() => {
    if (!fromSnapshot || !toSnapshot) return null;
    const comparison = VersionComparator.compare(fromSnapshot, toSnapshot);
    const graph = ImpactAnalyzer.buildGraph(toSnapshot);
    return ImpactAnalyzer.analyze(comparison, graph);
  }, [fromSnapshot, toSnapshot]);

  const project = projects.find((p) => p.id === projectId);

  return (
    <div className="w-full">
      <PageHeader
        title="Impacto das Alterações"
        description="Descubra automaticamente quais módulos podem ser afetados por cada mudança entre duas versões, com nível de risco e grafo de dependências."
        badge="EPIC 07"
        badgeVariant="info"
      />

      {projects.length === 0 ? (
        <InfoBox variant="tip" title="Nenhum projeto analisado ainda">
          Envie um arquivo ZIP na tela de Upload para começar a analisar impacto entre versões.
        </InfoBox>
      ) : (
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
              Importe um novo ZIP deste mesmo projeto para gerar uma segunda versão e habilitar a análise de impacto.
            </InfoBox>
          )}

          {versions.length >= 2 && (!fromSnapshot || !toSnapshot) && (
            <InfoBox variant="warning" title="Versão sem snapshot">
              Uma das versões selecionadas não possui dados suficientes para analisar impacto. Selecione versões mais recentes.
            </InfoBox>
          )}

          {report && (
            <>
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-6 py-5 mb-6 flex flex-wrap items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{project?.rootName}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {formatDate(fromId ? versions.find((v) => v.id === fromId)?.snapshotAt ?? '' : '')}
                      <ArrowRight className="h-3 w-3" />
                      {formatDate(toId ? versions.find((v) => v.id === toId)?.snapshotAt ?? '' : '')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {report.entries.length === 0
                      ? 'Nenhuma alteração estrutural detectada — sem impacto a avaliar.'
                      : `${report.entries.length} alteração(ões) analisada(s).`}
                  </p>
                </div>
                {report.entries.length > 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Risco geral</span>
                    <RiskBadge level={report.overallRisk === 'none' ? 'low' : report.overallRisk} />
                  </div>
                )}
              </div>

              {report.entries.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <div className="space-y-3">
                    {report.entries.map((entry) => (
                      <ImpactCard
                        key={entry.trigger.id}
                        entry={entry}
                        selected={selectedEntry?.trigger.id === entry.trigger.id}
                        onSelect={() => setSelectedEntry(entry)}
                      />
                    ))}
                  </div>

                  <div className="lg:sticky lg:top-6">
                    {selectedEntry ? (
                      <DependencyGraph entry={selectedEntry} />
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                        Selecione "Ver grafo de dependências" em um item ao lado para visualizar as conexões.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
