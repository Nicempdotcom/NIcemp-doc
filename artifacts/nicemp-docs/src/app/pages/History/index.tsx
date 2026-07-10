import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
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
import {
  ProjectRepository,
  VersionRepository,
  VersionSnapshotRepository,
} from '@/services/storage';
import { ROUTES } from '@/routes';
import VersionCard from './VersionCard';

export default function History() {
  const navigate = useNavigate();
  const projects = useMemo(() => ProjectRepository.findAll(), []);
  const [projectId, setProjectId] = useState<string>(() => ProjectRepository.findLatest()?.id ?? '');

  const versions = useMemo(
    () => (projectId ? VersionRepository.findByProject(projectId) : []), // newest first
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

  return (
    <div className="w-full">
      <PageHeader
        title="Histórico Inteligente"
        description="Linha do tempo de todas as versões analisadas do seu projeto — abra qualquer versão ou compare duas entre si."
        badge="EPIC 06"
        badgeVariant="info"
      />

      {projects.length === 0 ? (
        <InfoBox variant="tip" title="Nenhum projeto analisado ainda">
          Envie um arquivo ZIP na tela de Upload para começar a construir o histórico de versões.
        </InfoBox>
      ) : (
        <>
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
                    // selected[0] chosen first, selected[1] second; order chronologically for a clean diff
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

          {versions.length === 0 ? (
            <InfoBox variant="tip" title="Sem versões para este projeto">
              Ainda não há versões registradas.
            </InfoBox>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
              {versions.map((version, idx) => {
                const previous = versions[idx + 1]; // versions sorted desc, so next item = older
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
        </>
      )}
    </div>
  );
}
