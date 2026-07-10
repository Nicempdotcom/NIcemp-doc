import React from 'react';
import { Info, Lightbulb, AlertTriangle, AlertOctagon } from 'lucide-react';

interface InfoBoxProps {
  variant: 'info' | 'tip' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
}

export default function InfoBox({ variant, title, children }: InfoBoxProps) {
  const getStyles = () => {
    switch (variant) {
      case 'tip':
        return {
          container: 'border-emerald-500 bg-emerald-500/5',
          icon: 'text-emerald-500',
          Icon: Lightbulb
        };
      case 'warning':
        return {
          container: 'border-amber-500 bg-amber-500/5',
          icon: 'text-amber-500',
          Icon: AlertTriangle
        };
      case 'danger':
        return {
          container: 'border-red-500 bg-red-500/5',
          icon: 'text-red-500',
          Icon: AlertOctagon
        };
      case 'info':
      default:
        return {
          container: 'border-blue-500 bg-blue-500/5',
          icon: 'text-blue-500',
          Icon: Info
        };
    }
  };

  const { container, icon, Icon } = getStyles();

  return (
    <div className={`flex gap-3 rounded-md px-4 py-3 border-l-4 ${container} my-4`}>
      <Icon className={`h-[18px] w-[18px] shrink-0 mt-0.5 ${icon}`} />
      <div className="flex flex-col gap-1">
        {title && <span className="font-semibold text-sm text-foreground">{title}</span>}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}