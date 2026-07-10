// ─── Analyzer Feature — Types ─────────────────────────────────────────────────

import type { ProjectMap } from '@/services/engine';
import type { LiveCounts } from '@/workers/types';

export type { ProjectMap, LiveCounts };

export type AnalysisPhase =
  | 'idle'
  | 'reading_file'   // File bytes being read by UploadProvider (shown in ProcessingScreen)
  | 'scanning'       // Worker: reading ZIP entries + file content
  | 'categorizing'   // Worker: classifying files by category
  | 'dependencies'   // Worker: parsing package.json + imports
  | 'technology'     // Worker: detecting tech stack
  | 'building'       // Worker: assembling ProjectMap
  | 'completed'
  | 'cancelled'
  | 'failed';

export const PHASE_LABELS: Record<AnalysisPhase, string> = {
  idle:         'Aguardando',
  reading_file: 'Lendo arquivo',
  scanning:     'Lendo estrutura',
  categorizing: 'Classificando',
  dependencies: 'Dependências',
  technology:   'Stack tech',
  building:     'Montando mapa',
  completed:    'Concluído',
  cancelled:    'Cancelado',
  failed:       'Erro',
};

export interface AnalyzerState {
  phase:      AnalysisPhase;
  pct:        number;          // 0–100 worker progress
  label:      string;          // Current step label from worker
  counts:     LiveCounts;
  projectMap: ProjectMap | null;
  error:      string | null;
  /** File info for the ProcessingScreen header. */
  fileName:   string;
  fileSize:   number;
}
