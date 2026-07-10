import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/app/components/ui/toaster';
import { TooltipProvider } from '@/app/components/ui/tooltip';

import Sidebar from '@/app/layouts/Sidebar';
import Topbar from '@/app/layouts/Topbar';

import Dashboard    from '@/app/pages/Dashboard';
import Upload       from '@/app/pages/Upload';
import Comparison   from '@/app/pages/Comparison';
import Architecture from '@/app/pages/Architecture';
import Frontend     from '@/app/pages/Frontend';
import Backend      from '@/app/pages/Backend';
import Database     from '@/app/pages/Database';
import Modules      from '@/app/pages/Modules';
import Prompts      from '@/app/pages/Prompts';
import Settings     from '@/app/pages/Settings';
import NotFound     from '@/app/pages/not-found';
import { ROUTES }   from '@/routes';

import { AnalyzerProvider }       from '@/features/analyzer';
import { DocumentationProvider }  from '@/features/documentation';
import { HistoryProvider }        from '@/features/history';
import { ImpactProvider }         from '@/features/impact';

// ─── Theme ────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

// ─── React Query ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

// ─── Layout ───────────────────────────────────────────────────────────────────

function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col md:pl-60 min-w-0">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-8 py-8">
            <Routes>
              <Route path={ROUTES.dashboard}    element={<Dashboard />}    />
              <Route path={ROUTES.upload}       element={<Upload />}       />
              <Route path={ROUTES.comparison}   element={<Comparison />}   />
              <Route path={ROUTES.architecture} element={<Architecture />} />
              <Route path={ROUTES.frontend}     element={<Frontend />}     />
              <Route path={ROUTES.backend}      element={<Backend />}      />
              <Route path={ROUTES.database}     element={<Database />}     />
              <Route path={ROUTES.modules}      element={<Modules />}      />
              <Route path={ROUTES.prompts}      element={<Prompts />}      />
              <Route path={ROUTES.settings}     element={<Settings />}     />
              <Route path="*"                   element={<NotFound />}     />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('nicemp-docs-theme') as Theme) || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('nicemp-docs-theme', theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
        <AnalyzerProvider>
          <DocumentationProvider>
            <HistoryProvider>
              <ImpactProvider>
                <TooltipProvider>
                  <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                    <Layout />
                  </BrowserRouter>
                  <Toaster />
                </TooltipProvider>
              </ImpactProvider>
            </HistoryProvider>
          </DocumentationProvider>
        </AnalyzerProvider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
