/**
 * useAssistantAI
 *
 * Manages the AI assistant conversation: message history, loading state, and
 * the fetch call to POST /api/ai/assistant. Never throws — all error states
 * are surfaced via the returned message list.
 */

import { useState, useCallback } from 'react';
import { buildAssistantContext } from './buildAssistantContext';

export type MessageRole = 'user' | 'assistant' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

export function useAssistantAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const ctx = buildAssistantContext();

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context: ctx?.summary ?? 'Nenhum projeto carregado no momento.',
        }),
      });

      const data = await res.json() as {
        reply?: string | null;
        fallback?: boolean;
        limitReached?: boolean;
      };

      if (data.fallback) {
        const errorMsg: ChatMessage = {
          id: `e-${Date.now()}`,
          role: 'error',
          content: data.limitReached
            ? 'Limite diário de mensagens atingido. Tente novamente amanhã.'
            : 'Não foi possível obter uma resposta da IA no momento. Tente novamente em instantes.',
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply?.trim() || '(resposta vazia)',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'error',
        content: 'Erro de rede. Verifique sua conexão e tente novamente.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, loading, sendMessage, clearMessages };
}
