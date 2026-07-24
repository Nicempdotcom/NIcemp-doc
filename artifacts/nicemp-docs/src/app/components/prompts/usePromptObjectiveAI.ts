/**
 * usePromptObjectiveAI
 *
 * Shared hook that calls POST /api/ai/prompt-objective and handles all error
 * states (network failure, AI unavailable, daily rate-limit) with a toast
 * notification. Returns the generated objective string on success, or null
 * on any failure — callers never need to catch.
 */
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface PromptObjectivePayload {
  kind:          string;
  name:          string;
  location?:     string;
  module?:       string;
  description?:  string;
  dependencies?: string;
  userRequest:   string;
}

export function usePromptObjectiveAI() {
  const [aiLoading, setAiLoading] = useState(false);

  const requestImprovement = useCallback(
    async (payload: PromptObjectivePayload): Promise<string | null> => {
      setAiLoading(true);
      try {
        const res = await fetch('/api/ai/prompt-objective', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind:         payload.kind,
            name:         payload.name,
            location:     payload.location     ?? '',
            module:       payload.module       ?? '',
            description:  payload.description  ?? '',
            dependencies: payload.dependencies ?? '',
            userRequest:  payload.userRequest,
          }),
        });
        const data = await res.json() as {
          objective?: string | null;
          fallback?: boolean;
          limitReached?: boolean;
        };
        if (data.fallback) {
          toast({
            title: 'Não foi possível usar a IA agora, o prompt padrão foi mantido',
            description: data.limitReached
              ? 'Limite diário de melhorias com IA atingido.'
              : undefined,
            variant: 'destructive',
          });
          return null;
        }
        return data.objective ?? null;
      } catch {
        toast({
          title:   'Não foi possível usar a IA agora, o prompt padrão foi mantido',
          variant: 'destructive',
        });
        return null;
      } finally {
        setAiLoading(false);
      }
    },
    [],
  );

  return { aiLoading, requestImprovement };
}
