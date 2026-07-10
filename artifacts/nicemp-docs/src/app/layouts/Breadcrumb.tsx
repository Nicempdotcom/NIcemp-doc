import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/routes';

const getRouteLabel = (pathname: string) => {
  switch (pathname) {
    case ROUTES.dashboard:    return 'Dashboard';
    case ROUTES.upload:       return 'Upload de Projeto';
    case ROUTES.project:      return 'Projeto';
    case ROUTES.history:      return 'Histórico Inteligente';
    case ROUTES.comparison:   return 'Comparação de Versões';
    case ROUTES.impact:       return 'Impacto das Alterações';
    case ROUTES.architecture: return 'Arquitetura';
    case ROUTES.frontend:     return 'Frontend';
    case ROUTES.backend:      return 'Backend';
    case ROUTES.database:     return 'Banco de Dados';
    case ROUTES.components:   return 'Componentes';
    case ROUTES.hooks:        return 'Hooks';
    case ROUTES.apis:         return 'APIs';
    case ROUTES.dependencies: return 'Dependências';
    case ROUTES.modules:      return 'Módulos';
    case ROUTES.prompts:      return 'Prompts Replit';
    case ROUTES.settings:     return 'Configurações';
    default: return 'Página não encontrada';
  }
};

export default function Breadcrumb() {
  const location = useLocation();
  const isRoot = location.pathname === ROUTES.dashboard;

  if (isRoot) {
    return (
      <div className="flex items-center text-sm font-medium text-foreground">
        NicEmp Docs
      </div>
    );
  }

  return (
    <div className="flex items-center text-sm">
      <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
        NicEmp Docs
      </Link>
      <span className="text-muted-foreground/40 mx-1 text-sm">{'>'}</span>
      <span className="text-foreground font-medium">
        {getRouteLabel(location.pathname)}
      </span>
    </div>
  );
}