import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/app/components/ui/toaster';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import { Loader2 } from 'lucide-react';

import Sidebar from '@/app/layouts/Sidebar';
import Topbar from '@/app/layouts/Topbar';

import Dashboard    from '@/app/pages/Dashboard';
import Upload       from '@/app/pages/Upload';
import Project      from '@/app/pages/Project';
import Comparison   from '@/app/pages/Comparison';
import History      from '@/app/pages/History';
import Impact       from '@/app/pages/Impact';
import Architecture from '@/app/pages/Architecture';
import Frontend     from '@/app/pages/Frontend';
import Backend      from '@/app/pages/Backend';
import Database     from '@/app/pages/Database';
import Components   from '@/app/pages/Components';
import Hooks        from '@/app/pages/Hooks';
import Apis         from '@/app/pages/Apis';
import Dependencies from '@/app/pages/Dependencies';
import Modules      from '@/app/pages/Modules';
import Prompts      from '@/app/pages/Prompts';
import Settings     from '@/app/pages/Settings';
import Login        from '@/app/pages/Login';
import Overview     from '@/app/pages/Overview';
import Explorer     from '@/app/pages/Explorer';
import Glossario    from '@/app/pages/Glossario';
import NotFound     from '@/app/pages/not-found';
import { ROUTES }   from '@/routes';

import { AnalyzerProvider }       from '@/features/analyzer';
import { DocumentationProvider }  from '@/features/documentation';
import { HistoryProvider }        from '@/features/history';
import { ImpactProvider }         from '@/features/impact';
import { AuthProvider, useAuth }  from '@/app/providers/AuthProvider';
import { HydrationService }       from '@/services/storage/HydrationService';
import { isSupabaseConfigured }   from '@/lib/supabase';

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

// ─── Hydration gate ───────────────────────────────────────────────────────────

/**
 * After successful auth (or in localStorage-only mode), hydrate the local
 * cache from Supabase before rendering the app. Shows a centered spinner while
 * in progress so users never see stale/empty pages on first load.
 */
function HydrationGate({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured); // skip when not configured

  useEffect(() => {
    if (authLoading) return;
    if (!isSupabaseConfigured) { setHydrated(true); return; }
    if (!session) { setHydrated(true); return; } // login screen will handle auth
    HydrationService.hydrate().finally(() => setHydrated(true));
  }, [authLoading, session]);

  if (authLoading || !hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-sm">Carregando dados…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Auth gate ────────────────────────────────────────────────────────────────

/**
 * Blocks the app behind the Login page when Supabase is configured but
 * there is no valid session. In localStorage-only mode (Supabase not
 * configured), the app renders freely.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  if (isSupabaseConfigured && !session) {
    return <Login />;
  }

  return <>{children}</>;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col md:pl-60 min-w-0">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-4xl px-8 py-8">
            <Routes>
              <Route path={ROUTES.dashboard}    element={<Dashboard />}    />
              <Route path={ROUTES.upload}       element={<Upload />}       />
              <Route path={ROUTES.project}      element={<Project />}      />
              <Route path={ROUTES.history}      element={<History />}      />
              <Route path={ROUTES.comparison}   element={<Comparison />}   />
              <Route path={ROUTES.impact}       element={<Impact />}       />
              <Route path={ROUTES.architecture} element={<Architecture />} />
              <Route path={ROUTES.frontend}     element={<Frontend />}     />
              <Route path={ROUTES.backend}      element={<Backend />}      />
              <Route path={ROUTES.database}     element={<Database />}     />
              <Route path={ROUTES.components}   element={<Components />}   />
              <Route path={ROUTES.hooks}        element={<Hooks />}        />
              <Route path={ROUTES.apis}         element={<Apis />}         />
              <Route path={ROUTES.dependencies} element={<Dependencies />} />
              <Route path={ROUTES.modules}      element={<Modules />}      />
              <Route path={ROUTES.overview}     element={<Overview />}     />
              <Route path={ROUTES.explorer}     element={<Explorer />}     />
              <Route path={ROUTES.glossario}    element={<Glossario />}    />
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
        <AuthProvider>
          <HydrationGate>
            <AuthGate>
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
            </AuthGate>
          </HydrationGate>
        </AuthProvider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
