import React from 'react';
import { NavLink } from 'react-router-dom';
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
      { label: 'Impacto',        icon: AlertTriangle,   href: ROUTES.impact     },
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

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { session, signOut } = useAuth();

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
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 mt-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {group.label}
              </p>
              <div className="space-y-0.5">
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
          ))}
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
