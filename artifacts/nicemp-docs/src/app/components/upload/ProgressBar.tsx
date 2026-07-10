import React from 'react';
import { cn } from '@/utils';

interface ProgressBarProps {
  value: number;          // 0–100
  label?: string;
  className?: string;
  variant?: 'default' | 'success' | 'error';
}

export default function ProgressBar({ value, label, className, variant = 'default' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const trackColor = {
    default: 'bg-primary',
    success: 'bg-emerald-500',
    error:   'bg-destructive',
  }[variant];

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xs font-medium text-foreground tabular-nums">{clamped}%</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300 ease-out', trackColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
