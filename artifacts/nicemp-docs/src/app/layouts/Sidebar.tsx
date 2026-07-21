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
  ChevronLeft,
  Plug,
  Github,
  FileStack,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ROUTES }                    from '@/routes';
import { useAuth }                   from '@/app/providers/AuthProvider';
import { isSupabaseConfigured }      from '@/lib/supabase';
import { PreferencesRepository }     from '@/services/storage/PreferencesRepository';

// ─── Grupos de navegação ───────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Plataforma',
    items: [
      { label: 'Início',             icon: LayoutDashboard, href: ROUTES.dashboard    },
      { label: 'Upload',             icon: UploadCloud,     href: ROUTES.upload       },
      { label: 'Importar do GitHub', icon: Github,          href: ROUTES.github       },
      { label: 'Glossário',          icon: BookOpen,        href: ROUTES.glossario    },
      { label: 'Projeto',            icon: FolderKanban,    href: ROUTES.project      },
      { label: 'Histórico',          icon: History,         href: ROUTES.history      },
      { label: 'Comparação',         icon: GitCompare,      href: ROUTES.comparison   },
      { label: 'Impacto',            icon: AlertTriangle,   href: ROUTES.impact       },
      { label: 'Organograma',        icon: Network,         href: ROUTES.overview     },
      { label: 'Prompts Replit',     icon: Bot,             href: ROUTES.prompts      },
      { label: 'Explorador ao vivo', icon: Search,          href: ROUTES.explorer     },
    ],
  },
  {
    label: 'Estrutura & Camadas',
    items: [
      { label: 'Arquitetura',    icon: Network,   href: ROUTES.architecture },
      { label: 'Frontend',       icon: Monitor,   href: ROUTES.frontend     },
      { label: 'Backend',        icon: Server,    href: ROUTES.backend      },
      { label: 'Banco de Dados', icon: Database,  href: ROUTES.database     },
    ],
  },
  {
    label: 'Inventário Técnico',
    items: [
      { label: 'Componentes',    icon: Layers,     href: ROUTES.components   },
      { label: 'Hooks',          icon: Zap,        href: ROUTES.hooks        },
      { label: 'APIs',           icon: Globe,      href: ROUTES.apis         },
      { label: 'Dependências',   icon: Package,    href: ROUTES.dependencies },
      { label: 'Integrações',    icon: Plug,       href: ROUTES.integrations },
      { label: 'Módulos',        icon: FileStack,  href: ROUTES.modules      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Configurações',  icon: Settings,  href: ROUTES.settings     },
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen:           boolean;
  onClose:          () => void;
  collapsed:        boolean;
  onToggleCollapse: () => void;
}

const GROUPS_STORAGE_KEY = 'sidebar:groups';

function findActiveGroupLabel(pathname: string): string | undefined {
  return NAV_GROUPS.find((g) => g.items.some((item) => item.href === pathname))?.label;
}

function loadStoredGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { session, signOut } = useAuth();
  const location = useLocation();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const stored      = loadStoredGroups();
    const activeLabel = findActiveGroupLabel(location.pathname);
    const defaultOpen = !PreferencesRepository.get().sidebarDefaultCollapsed;
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => {
      initial[g.label] = stored[g.label] ?? defaultOpen;
    });
    if (activeLabel) initial[activeLabel] = true;
    return initial;
  });

  // Keep active group open on navigation
  useEffect(() => {
    const activeLabel = findActiveGroupLabel(location.pathname);
    if (!activeLabel) return;
    setOpenGroups((prev) => (prev[activeLabel] ? prev : { ...prev, [activeLabel]: true }));
  }, [location.pathname]);

  // Persist group open/close state
  useEffect(() => {
    try {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(openGroups));
    } catch { /* ignore */ }
  }, [openGroups]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 flex flex-col h-full bg-sidebar border-r border-sidebar-border
          transition-[transform,width] duration-300 ease-in-out md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'w-[56px]' : 'w-60'}
        `}
      >
        {/* ── Logo + collapse toggle ──────────────────────────────────────── */}
        <div className={`
          flex h-14 shrink-0 items-center border-b border-sidebar-border
          ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}
        `}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-base text-foreground tracking-tight">NicEmp</span>
              <span className="text-sm font-medium text-muted-foreground">Docs</span>
              <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                v1.0
              </span>
            </div>
          )}

          {/* Desktop collapse/expand button */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed
              ? <PanelLeftOpen  className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />
            }
          </button>

          {/* Mobile close button */}
          {!collapsed && (
            <button
              className="md:hidden p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden py-2">
          {NAV_GROUPS.map((group) => {
            const isGroupOpen = !collapsed && (openGroups[group.label] ?? true);

            return (
              <div key={group.label} className={collapsed ? 'mb-1' : ''}>
                {/* Group header — hidden when collapsed */}
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={isGroupOpen}
                    className="w-full flex items-center justify-between gap-2 px-3 mb-1 mt-3 text-[10px] uppercase tracking-widest text-foreground/50 font-bold hover:text-foreground/80 transition-colors"
                  >
                    <span>{group.label}</span>
                    {isGroupOpen
                      ? <ChevronDown  className="h-3 w-3 shrink-0" />
                      : <ChevronRight className="h-3 w-3 shrink-0" />
                    }
                  </button>
                )}

                {/* Separator between groups when collapsed */}
                {collapsed && (
                  <div className="mx-3 my-1.5 h-px bg-sidebar-border/60" />
                )}

                {/* Items */}
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                  style={collapsed ? {} : { gridTemplateRows: isGroupOpen ? '1fr' : '0fr' }}
                >
                  <div className={collapsed ? '' : 'overflow-hidden'}>
                    <div className={`space-y-0.5 ${collapsed ? 'px-1.5 pb-0.5' : 'px-2 pb-1'}`}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.href}
                            to={item.href}
                            onClick={onClose}
                            title={collapsed ? item.label : undefined}
                            className={({ isActive }) =>
                              collapsed
                                ? `flex items-center justify-center rounded-lg h-9 w-9 mx-auto transition-all duration-150
                                   ${isActive
                                     ? 'bg-primary/10 text-primary shadow-sm shadow-primary/10'
                                     : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                                   }`
                                : `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150
                                   ${isActive
                                     ? 'border-l-2 border-primary bg-primary/5 text-primary font-medium'
                                     : 'border-l-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                   }`
                            }
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!collapsed && (
                              <span className="truncate">{item.label}</span>
                            )}
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

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {collapsed ? (
          /* Collapsed: only logout icon */
          isSupabaseConfigured && session && (
            <div className="shrink-0 border-t border-sidebar-border py-3 flex justify-center">
              <button
                onClick={signOut}
                title="Sair"
                className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )
        ) : (
          /* Expanded: email + logout + copyright */
          <div className="shrink-0 border-t border-sidebar-border px-4 py-4 space-y-2">
            {isSupabaseConfigured && session && (
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs text-muted-foreground truncate"
                  title={session.user.email}
                >
                  {session.user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 shrink-0"
                  title="Sair"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">NicEmp © 2025</p>
          </div>
        )}
      </aside>
    </>
  );
}
