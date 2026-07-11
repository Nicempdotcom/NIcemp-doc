import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  GitCompare,
  History,
  AlertTriangle,
  Network,
  Monitor,
  Server,
  Database,
  Package,
  Bot,
  Settings,
  X,
  FolderKanban,
  Layers,
  Zap,
  Globe,
  LogOut,
  Search,
  BookOpen,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ROUTES } from '@/routes';
import { useAuth } from '@/app/providers/AuthProvider';
import { isSupabaseConfigured } from '@/lib/supabase';

const NAV_GROUPS = [
  {
    label: 'Plataforma',
    items: [
      { label: 'Dashboard',      icon: LayoutDashboard, href: ROUTES.dashboard  },
      { label: 'Upload',         icon: UploadCloud,     href: ROUTES.upload     },
      { label: 'Projeto',        icon: FolderKanban,    href: ROUTES.project    },
      { label: 'Histórico',      icon: History,         href: ROUTES.history    },
      { label: 'Comparação',     icon: GitCompare,      href: ROUTES.comparison },
      { label: 'Impacto',          icon: AlertTriangle,   href: ROUTES.impact     },
      { label: 'Organograma',      icon: Network,         href: ROUTES.overview   },
      { label: 'Explorador ao vivo', icon: Search,        href: ROUTES.explorer   },
    ],
  },
  {
    label: 'Documentação',
    items: [
      { label: 'Arquitetura',    icon: Network,         href: ROUTES.architecture },
      { label: 'Frontend',       icon: Monitor,         href: ROUTES.frontend     },
      { label: 'Backend',        icon: Server,          href: ROUTES.backend      },
      { label: 'Banco de Dados', icon: Database,        href: ROUTES.database     },
      { label: 'Componentes',    icon: Layers,          href: ROUTES.components   },
      { label: 'Hooks',          icon: Zap,             href: ROUTES.hooks        },
      { label: 'APIs',           icon: Globe,           href: ROUTES.apis         },
      { label: 'Dependências',   icon: Package,         href: ROUTES.dependencies },
      { label: 'Módulos',        icon: Package,         href: ROUTES.modules      },
      { label: 'Prompts Replit', icon: Bot,             href: ROUTES.prompts      },
      { label: 'Glossário',      icon: BookOpen,        href: ROUTES.glossario    },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Configurações',  icon: Settings,        href: ROUTES.settings },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const GROUPS_STORAGE_KEY = 'sidebar:groups';

function findActiveGroupLabel(pathname: string): string | undefined {
  return NAV_GROUPS.find((group) => group.items.some((item) => item.href === pathname))?.label;
}

function loadStoredGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { session, signOut } = useAuth();
  const location = useLocation();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const stored = loadStoredGroups();
    const activeLabel = findActiveGroupLabel(location.pathname);
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach((group) => {
      initial[group.label] = stored[group.label] ?? false;
    });
    if (activeLabel) initial[activeLabel] = true;
    return initial;
  });

  // Always keep the group of the currently active route open, even if the
  // user had previously collapsed it or navigated from another group.
  useEffect(() => {
    const activeLabel = findActiveGroupLabel(location.pathname);
    if (!activeLabel) return;
    setOpenGroups((prev) => (prev[activeLabel] ? prev : { ...prev, [activeLabel]: true }));
  }, [location.pathname]);

  // Persist the user's collapse/expand preference across reloads.
  useEffect(() => {
    try {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(openGroups));
    } catch {
      // localStorage may be unavailable (e.g. private mode) — ignore silently.
    }
  }, [openGroups]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 flex flex-col h-full w-60 bg-sidebar border-r border-sidebar-border
        transition-transform duration-300 ease-in-out md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-foreground tracking-tight">NicEmp</span>
            <span className="text-sm font-medium text-muted-foreground">Docs</span>
            <span className="ml-1 flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              v1.0
            </span>
          </div>
          <button
            className="md:hidden p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {NAV_GROUPS.map((group) => {
            const isGroupOpen = openGroups[group.label] ?? false;
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isGroupOpen}
                  className="w-full flex items-center justify-between gap-2 px-3 mb-1 mt-2 text-[11px] uppercase tracking-wider text-foreground/60 font-bold hover:text-foreground transition-colors"
                >
                  <span>{group.label}</span>
                  {isGroupOpen ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                  style={{ gridTemplateRows: isGroupOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-0.5 pb-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.href}
                            to={item.href}
                            onClick={onClose}
                            className={({ isActive }) => `
                              flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150
                              ${isActive
                                ? 'border-l-2 border-primary bg-primary/5 text-primary font-medium'
                                : 'border-l-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
                              }
                            `}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer — user session + logout */}
        <div className="shrink-0 border-t border-sidebar-border px-4 py-4 space-y-2">
          {isSupabaseConfigured && session && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={session.user.email}>
                {session.user.email}
              </span>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md p-1"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">NicEmp © 2025</p>
        </div>
      </aside>
    </>
  );
}
