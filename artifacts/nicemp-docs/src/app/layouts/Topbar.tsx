import React from 'react';
import { Menu, Sun, Moon, Search } from 'lucide-react';
import { useTheme } from '@/App';
import Breadcrumb from '@/app/layouts/Breadcrumb';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-8">
      <div className="flex items-center gap-4">
        <button 
          className="md:hidden p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors" 
          onClick={onMenuClick}
          aria-label="Toggle Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="hidden sm:block">
          <Breadcrumb />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          className="hidden sm:flex items-center gap-2 w-32 border border-border rounded-md px-3 py-1 text-xs text-muted-foreground bg-background hover:bg-accent transition-colors cursor-pointer"
          aria-label="Search"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="font-sans text-[10px] font-semibold tracking-wider">⌘K</kbd>
        </button>
        
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}