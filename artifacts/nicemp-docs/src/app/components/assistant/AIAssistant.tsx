/**
 * AIAssistant
 *
 * Floating chat button (bottom-right, fixed) that opens a side panel with an
 * AI assistant pre-loaded with the current project's metadata as context.
 * Works on every page of the app.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { buildAssistantContext } from './buildAssistantContext';
import { useAssistantAI, type ChatMessage } from './useAssistantAI';
import { cn } from '@/utils';

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser  = msg.role === 'user';
  const isError = msg.role === 'error';

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser  && 'bg-primary text-primary-foreground rounded-br-sm',
          isError && 'bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm',
          !isUser && !isError && 'bg-muted text-foreground rounded-bl-sm',
        )}
      >
        {isError && (
          <span className="mr-1.5 inline-flex items-center">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          </span>
        )}
        {msg.content}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIAssistant() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const bottomRef             = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLTextAreaElement>(null);

  const { messages, loading, sendMessage, clearMessages } = useAssistantAI();

  const ctx = buildAssistantContext();

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── Floating button ──────────────────────────────────────────────── */}
      <button
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente de IA'}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center',
          'rounded-full shadow-lg transition-all duration-200',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'ring-2 ring-background',
          open && 'rotate-[360deg]',
        )}
        style={{ height: 52, width: 52 }}
      >
        {open
          ? <X className="h-5 w-5" />
          : <Bot className="h-5 w-5" />
        }
      </button>

      {/* ── Side panel ───────────────────────────────────────────────────── */}
      {open && (
        <div
          className={cn(
            'fixed bottom-20 right-5 z-50 flex flex-col',
            'w-[360px] max-w-[calc(100vw-2.5rem)]',
            'h-[520px] max-h-[calc(100dvh-6rem)]',
            'rounded-2xl border border-border bg-background shadow-2xl',
            'animate-in slide-in-from-bottom-4 fade-in-0 duration-200',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Assistente</span>
              {ctx && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                  {ctx.projectName}
                </span>
              )}
              {!ctx && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  sem projeto
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={clearMessages}
                  title="Limpar conversa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Bot className="h-9 w-9 opacity-30" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Olá! Como posso ajudar?</p>
                  <p className="text-xs max-w-[260px] leading-relaxed opacity-80">
                    {ctx
                      ? `Estou ciente do projeto "${ctx.projectName}". Pergunte sobre módulos, componentes, hooks, APIs ou como formular um prompt.`
                      : 'Nenhum projeto carregado. Faça upload de um ZIP ou importe do GitHub primeiro.'
                    }
                  </p>
                </div>
                {ctx && (
                  <div className="mt-1 flex flex-col gap-1.5 w-full">
                    {[
                      'Quais módulos existem no projeto?',
                      'Como formular um prompt para alterar um componente?',
                      'Onde fica a lógica de autenticação?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                        className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-left text-foreground/70 hover:bg-muted transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Pensando…</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre o projeto…"
                rows={1}
                disabled={loading}
                className={cn(
                  'flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:opacity-50',
                  'max-h-28 overflow-y-auto',
                )}
                style={{ minHeight: 38 }}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="h-[38px] w-[38px] shrink-0 rounded-xl"
                title="Enviar (Enter)"
              >
                {loading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground/60 text-center">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </div>
      )}
    </>
  );
}
