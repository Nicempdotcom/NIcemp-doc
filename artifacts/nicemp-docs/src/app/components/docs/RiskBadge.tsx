import React from 'react';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskBadgeProps {
  level: RiskLevel;
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  const getConfig = () => {
    switch (level) {
      case 'low':
        return {
          label: 'Baixo',
          pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500'
        };
      case 'medium':
        return {
          label: 'Médio',
          pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500'
        };
      case 'high':
        return {
          label: 'Alto',
          pill: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
          dot: 'bg-orange-500'
        };
      case 'critical':
        return {
          label: 'Crítico',
          pill: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800',
          dot: 'bg-red-600 dark:bg-red-500'
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