import React from 'react';

type StatusType = 'stable' | 'beta' | 'deprecated' | 'experimental' | 'planned' | 'wip';

interface StatusBadgeProps {
  status: StatusType;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getConfig = () => {
    switch (status) {
      case 'stable':
        return {
          label: 'Estável',
          pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500'
        };
      case 'beta':
        return {
          label: 'Beta',
          pill: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
          dot: 'bg-blue-500'
        };
      case 'deprecated':
        return {
          label: 'Descontinuado',
          pill: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
          dot: 'bg-slate-500'
        };
      case 'experimental':
        return {
          label: 'Experimental',
          pill: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
          dot: 'bg-purple-500'
        };
      case 'planned':
        return {
          label: 'Planejado',
          pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500'
        };
      case 'wip':
        return {
          label: 'Em Progresso',
          pill: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
          dot: 'bg-orange-500'
        };
    }
  };

  const config = getConfig();

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${config.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${config.dot}`} />
      {config.label}
    </span>
  );
}