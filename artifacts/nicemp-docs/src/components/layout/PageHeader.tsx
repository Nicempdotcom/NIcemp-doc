import React from 'react';

type BadgeVariant = 'default' | 'info' | 'warning' | 'success' | 'danger';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
}

export default function PageHeader({ 
  title, 
  description, 
  badge,
  badgeVariant = 'default'
}: PageHeaderProps) {
  
  const getBadgeColors = () => {
    switch (badgeVariant) {
      case 'info':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'danger':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <h1 className="text-[2rem] font-bold tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {badge && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 ${getBadgeColors()}`}>
            {badge}
          </span>
        )}
      </div>
      
      <div className="border-b border-border pb-6 mb-6 mt-2" />
      
      {description && (
        <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}