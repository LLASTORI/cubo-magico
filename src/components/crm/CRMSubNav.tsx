import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Route, 
  Kanban, 
  CheckSquare, 
  RefreshCcw, 
  Workflow, 
  MessageCircle,
  Plus,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  { 
    label: 'Análises', 
    icon: Route, 
    path: '/crm',
    matchPaths: ['/crm']
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
  { 
    label: 'Automações', 
    icon: Workflow, 
    path: '/automations',
    matchPaths: ['/automations']
  },
  { 
    label: 'Chat ao Vivo', 
    icon: MessageCircle, 
    path: '/whatsapp',
    matchPaths: ['/whatsapp']
  },
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
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(p => {
        if (p === '/crm') {
          return currentPath === '/crm';
        }
        if (p === '/automations') {
          return currentPath === '/automations' || currentPath.startsWith('/automations/');
        }
        return currentPath.startsWith(p);
      });
    }
    return currentPath === item.path;
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
                  onClick={() => navigate(item.path)}
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
                onClick={() => navigate(settingsPath)}
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
