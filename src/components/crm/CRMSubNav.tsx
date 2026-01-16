import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import {
  Route, 
  Kanban, 
  CheckSquare, 
  RefreshCcw, 
  Plus,
  Settings,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  matchPaths?: string[];
}

/**
 * CRMSubNav - Navegação EXCLUSIVA do módulo CRM
 * 
 * REGRA ARQUITETURAL (PROMPT 21/22):
 * - Automações e WhatsApp NÃO pertencem ao CRM
 * - Eles são acessíveis pelo menu global, não pela CRMSubNav
 * - CRM = Contexto do cliente, não operação
 */
const navItems: NavItem[] = [
  { 
    label: 'Análises', 
    icon: Route, 
    path: '/crm',
    matchPaths: ['/crm']
  },
  { 
    label: 'Comportamento UTM', 
    icon: BarChart3, 
    path: '/crm/utm-behavior',
    matchPaths: ['/crm/utm-behavior']
  },
  { 
    label: 'Pipeline', 
    icon: Kanban, 
    path: '/crm/kanban',
    matchPaths: ['/crm/kanban', '/crm/pipeline-settings']
  },
  { 
    label: 'Atividades', 
    icon: CheckSquare, 
    path: '/crm/activities',
    matchPaths: ['/crm/activities', '/crm/cadences']
  },
  { 
    label: 'Recuperação', 
    icon: RefreshCcw, 
    path: '/crm/recovery',
    matchPaths: ['/crm/recovery', '/crm/recovery/kanban', '/crm/recovery/settings']
  },
  // REMOVIDOS (PROMPT 22): Automações e WhatsApp não pertencem ao CRM
  // Eles são acessíveis pelo menu global AppSidebar
];

interface CRMSubNavProps {
  showNewContact?: boolean;
  onNewContact?: () => void;
  showSettings?: boolean;
  settingsPath?: string;
  rightContent?: React.ReactNode;
}

export function CRMSubNav({ 
  showNewContact = false, 
  onNewContact,
  showSettings = false,
  settingsPath,
  rightContent
}: CRMSubNavProps) {
  const { navigateTo, projectCode } = useProjectNavigation();
  const location = useLocation();
  const currentPath = location.pathname;

  /**
   * isActive - Verifica se um item de navegação está ativo
   * 
   * CORREÇÃO PROMPT 22: Compara contra o path completo incluindo /app/:projectCode
   */
  const isActive = (item: NavItem) => {
    if (!projectCode) return false;
    
    const basePath = `/app/${projectCode}`;
    
    if (item.matchPaths) {
      return item.matchPaths.some(p => {
        const fullPath = `${basePath}${p}`;
        if (p === '/crm') {
          // Exato match para /crm (não /crm/xxx)
          return currentPath === fullPath;
        }
        return currentPath.startsWith(fullPath);
      });
    }
    
    return currentPath === `${basePath}${item.path}`;
  };

  return (
    <div className="border-b border-border bg-card/50 mb-6">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* Navigation Tabs */}
          <nav className="flex gap-1 -mb-px">
            {navItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigateTo(item.path)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    active 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 py-2">
            {showNewContact && (
              <Button size="sm" onClick={onNewContact}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Contato
              </Button>
            )}
            {showSettings && settingsPath && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigateTo(settingsPath)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            )}
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}
