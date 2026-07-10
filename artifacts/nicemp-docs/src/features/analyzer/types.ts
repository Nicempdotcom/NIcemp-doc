// ─── Analyzer Feature — Types ─────────────────────────────────────────────────

import type { ProjectMap } from '@/services/engine';

export type { ProjectMap };

/** Fine-grained pipeline phases shown in the UI. */
export type AnalysisPhase =
  | 'idle'
  | 'scanning'      // Lendo conteúdo dos arquivos do ZIP
  | 'categorizing'  // Classificando arquivos por categoria
  | 'dependencies'  // Analisando dependências
  | 'technology'    // Detectando stack tecnológico
  | 'building'      // Montando mapa do projeto
  | 'completed'
  | 'failed';

export const PHASE_LABELS: Record<AnalysisPhase, string> = {
  idle:         'Aguardando',
  scanning:     'Lendo arquivos',
  categorizing: 'Classificando',
  dependencies: 'Dependências',
  technology:   'Stack tech',
  building:     'Montando mapa',
  completed:    'Concluído',
  failed:       'Erro',
};

export interface AnalyzerState {
  phase:      AnalysisPhase;
  progress:   number;              // 0–100
  projectMap: ProjectMap | null;
  error:      string | null;
}
