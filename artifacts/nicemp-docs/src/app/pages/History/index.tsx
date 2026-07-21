import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitCompare, TrendingUp, History as HistoryIcon } from 'lucide-react';
import PageHeader from '@/app/layouts/PageHeader';
import { InfoBox } from '@/app/components/docs';
import { Button } from '@/app/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  ProjectRepository,
  VersionRepository,
  VersionSnapshotRepository,
  ProjectSnapshotRepository,
  ProjectChangesRepository,
} from '@/services/storage';
import { ROUTES } from '@/routes';
import VersionCard from './VersionCard';
import EvolutionSnapshotCard from './EvolutionSnapshotCard';

export default function History() {
  const navigate  = useNavigate();
  const projects  = useMemo(() => ProjectRepository.findAll(), []);
  const [projectId, setProjectId] = useState<string>(() => ProjectRepository.findLatest()?.id ?? '');

  const versions = useMemo(
    () => (projectId ? VersionRepository.findByProject(projectId) : []),
    [projectId],
  );

  // Evolution Engine data
  const evolutionSnapshots = useMemo(
    () => (projectId ? ProjectSnapshotRepository.findByProject(projectId) : []),
    [projectId],
  );
  const evolutionChanges = useMemo(
    () => (projectId ? ProjectChangesRepository.findByProject(projectId) : []),
    [projectId],
  );

  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const goCompare = (fromId: string, toId: string) => {
    navigate(`${ROUTES.comparison}?from=${fromId}&to=${toId}`);
  };

  const hasEvolution = evolutionSnapshots.length > 0;

  return (
    <div className="w-full">
      <PageHeader
        title="Histórico do Projeto"
        description="Linha do tempo das versões analisadas, evolução arquitetural e rastreamento de mudanças por arquivo."
        badge="Evolution Engine"
        badgeVariant="info"
      />

      {projects.length === 0 ? (
        <InfoBox variant="tip" title="Nenhum projeto analisado ainda">
          Envie um arquivo ZIP na tela de Upload para começar a construir o histórico de versões.
        </InfoBox>
      ) : (
        <>
          {/* Project selector */}
          <div className="bg-card border border-card-border rounded-lg p-5 mb-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5 min-w-[220px]">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Projeto</span>
                <Select value={projectId} onValueChange={(v) => { setProjectId(v); setSelected([]); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.rootName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {selected.length === 0 && 'Selecione duas versões para comparar'}
                  {selected.length === 1 && '1 versão selecionada — escolha mais uma'}
                  {selected.length === 2 && '2 versões selecionadas'}
                </span>
                <Button
                  size="sm"
                  disabled={selected.length !== 2}
                  onClick={() => {
                    const [a, b] = selected;
                    const va = versions.find((v) => v.id === a);
                    const vb = versions.find((v) => v.id === b);
                    if (!va || !vb) return;
                    const [from, to] = va.snapshotAt < vb.snapshotAt ? [va, vb] : [vb, va];
                    goCompare(from.id, to.id);
                  }}
                  className="gap-1.5"
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  Comparar selecionadas
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs: Histórico clássico | Evolution Engine */}
          <Tabs defaultValue={hasEvolution ? 'evolution' : 'versions'}>
            <TabsList className="mb-6">
              <TabsTrigger value="versions" className="gap-1.5">
                <HistoryIcon className="h-3.5 w-3.5" />
                Versões Analisadas
                {versions.length > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {versions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="evolution" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Evolução Arquitetural
                {hasEvolution && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {evolutionSnapshots.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Versões (classic history) ─────────────────────────── */}
            <TabsContent value="versions">
              {versions.length === 0 ? (
                <InfoBox variant="tip" title="Sem versões para este projeto">
                  Ainda não há versões registradas.
                </InfoBox>
              ) : (
                <div className="relative">
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
                  {versions.map((version, idx) => {
                    const previous = versions[idx + 1];
                    return (
                      <VersionCard
                        key={version.id}
                        version={version}
                        snapshot={VersionSnapshotRepository.findByVersion(version.id)}
                        isLatest={idx === 0}
                        selected={selected.includes(version.id)}
                        selectionDisabled={selected.length >= 2}
                        onToggleSelect={() => toggleSelect(version.id)}
                        onCompareWithPrevious={previous ? () => goCompare(previous.id, version.id) : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Tab: Evolução Arquitetural (Evolution Engine) ───────────── */}
            <TabsContent value="evolution">
              {evolutionSnapshots.length === 0 ? (
                <InfoBox variant="tip" title="Nenhum snapshot de evolução ainda">
                  O Evolution Engine registra snapshots automaticamente após cada análise.
                  Envie um ZIP para gerar o primeiro snapshot.
                </InfoBox>
              ) : (
                <>
                  {/* Summary stats */}
                  {evolutionChanges.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {[
                        {
                          label: 'Análises',
                          value: evolutionSnapshots.length,
                          color: 'text-primary',
                        },
                        {
                          label: 'Arquivos adicionados',
                          value: evolutionChanges.reduce((s, c) => s + c.added, 0),
                          color: 'text-emerald-600 dark:text-emerald-400',
                        },
                        {
                          label: 'Arquivos removidos',
                          value: evolutionChanges.reduce((s, c) => s + c.removed, 0),
                          color: 'text-red-600 dark:text-red-400',
                        },
                        {
                          label: 'Arquivos modificados',
                          value: evolutionChanges.reduce((s, c) => s + c.modified, 0),
                          color: 'text-blue-600 dark:text-blue-400',
                        },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-lg border border-card-border bg-card p-4 text-center">
                          <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="relative">
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
                    {evolutionSnapshots.map((snapshot, idx) => {
                      const change   = evolutionChanges.find((c) => c.toVersionId === snapshot.versionId) ?? null;
                      const version  = versions.find((v) => v.id === snapshot.versionId);
                      return (
                        <EvolutionSnapshotCard
                          key={snapshot.id}
                          snapshot={snapshot}
                          change={change}
                          version={version}
                          isLatest={idx === 0}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
