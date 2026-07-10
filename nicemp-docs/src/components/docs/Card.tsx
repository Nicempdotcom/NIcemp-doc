import React from 'react';
import { LucideIcon, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DocCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
}

export function DocCard({ title, description, icon: Icon, href, onClick }: DocCardProps) {
  const interactive = Boolean(href || onClick);
  
  const content = (
    <div className={`bg-card border border-card-border rounded-lg p-5 flex flex-col h-full ${interactive ? 'hover:border-primary/40 hover:shadow-sm transition-all duration-150' : ''}`}>
      {Icon && (
        <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground mt-auto pt-2">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{description}</p>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full cursor-pointer">
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block h-full w-full text-left cursor-pointer">
        {content}
      </button>
    );
  }
  
  return content;
}

interface FeatureCardProps {
  title: string;
  description: string;
  tag?: string;
}

export function FeatureCard({ title, description, tag }: FeatureCardProps) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col relative h-full">
      {tag && (
        <div className="absolute top-4 right-4 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
          {tag}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
    </div>
  );
}

interface LinkCardProps {
  title: string;
  description: string;
  href: string;
  external?: boolean;
}

export function LinkCard({ title, description, href, external }: LinkCardProps) {
  const content = (
    <div className="flex w-full items-center justify-between border border-card-border bg-card rounded-lg px-5 py-4 hover:border-primary/40 hover:bg-accent/30 transition-all duration-150 cursor-pointer">
      <div className="flex flex-col pr-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="shrink-0 text-muted-foreground">
        {external ? <ExternalLink className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block w-full">
        {content}
      </a>
    );
  }

  return (
    <Link to={href} className="block w-full">
      {content}
    </Link>
  );
}