import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/utils';
import type { UploadStage } from '@/features/upload';

interface Stage {
  key: UploadStage;
  label: string;
  sublabel: string;
}

const STAGES: Stage[] = [
  { key: 'reading',   label: 'Lendo',     sublabel: 'Carregando bytes do arquivo'     },
  { key: 'analyzing', label: 'Analisando', sublabel: 'Validando estrutura do ZIP'      },
  { key: 'completed', label: 'Concluído',  sublabel: 'Projeto carregado em memória'    },
];

const ORDER: UploadStage[] = ['idle', 'reading', 'analyzing', 'completed', 'error'];

interface StageIndicatorProps {
  current: UploadStage;
}

export default function StageIndicator({ current }: StageIndicatorProps) {
  if (current === 'idle') return null;

  const currentIdx = ORDER.indexOf(current);

  return (
    <div className="flex items-start gap-0">
      {STAGES.map((stage, i) => {
        const stageIdx = ORDER.indexOf(stage.key);
        const isDone    = current !== 'error' && currentIdx > stageIdx;
        const isActive  = current === stage.key;
        const isError   = current === 'error' && i === 0 && currentIdx <= stageIdx + 1;
        const isPending = !isDone && !isActive && !isError;

        return (
          <React.Fragment key={stage.key}>
            {/* Step */}
            <div className="flex flex-col items-center min-w-[80px]">
              {/* Icon circle */}
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                isDone    && 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
                isActive  && 'border-primary bg-primary/10 text-primary',
                isError   && 'border-destructive bg-destructive/10 text-destructive',
                isPending && 'border-border bg-background text-muted-foreground',
              )}>
                {isDone   && <CheckCircle2 className="h-4 w-4" />}
                {isActive && <Loader2 className="h-4 w-4 animate-spin" />}
                {isError  && <XCircle className="h-4 w-4" />}
                {isPending && <Clock className="h-3.5 w-3.5" />}
              </div>

              {/* Labels */}
              <p className={cn(
                'mt-2 text-xs font-medium text-center',
                (isDone || isActive) ? 'text-foreground' : 'text-muted-foreground',
                isError && 'text-destructive',
              )}>
                {stage.label}
              </p>
              <p className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5 hidden sm:block">
                {stage.sublabel}
              </p>
            </div>

            {/* Connector line (not after last) */}
            {i < STAGES.length - 1 && (
              <div className={cn(
                'mt-3.5 flex-1 h-0.5 transition-colors',
                isDone ? 'bg-emerald-500' : 'bg-border',
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
