/**
 * moduleSummaryContext
 *
 * Shared context for on-demand AI module summaries in the Organograma page.
 * SectionNode components consume this context to request and display summaries
 * without needing to pass callbacks through ReactFlow node data.
 */

import { createContext, useContext } from 'react';

export type SummaryStatus = 'idle' | 'loading' | 'done' | 'error';

export interface ModuleSummaryState {
  status: SummaryStatus;
  text?: string;
}

export interface ModuleSummaryContextValue {
  summaries: Record<string, ModuleSummaryState>;
  requestSummary: (moduleName: string) => void;
}

export const ModuleSummaryContext = createContext<ModuleSummaryContextValue>({
  summaries: {},
  requestSummary: () => undefined,
});

export function useModuleSummary(moduleName: string): {
  state: ModuleSummaryState;
  request: () => void;
} {
  const ctx = useContext(ModuleSummaryContext);
  return {
    state:   ctx.summaries[moduleName] ?? { status: 'idle' },
    request: () => ctx.requestSummary(moduleName),
  };
}
