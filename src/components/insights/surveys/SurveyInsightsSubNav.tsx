import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, TrendingUp, Brain, BookOpen, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  { 
    label: 'Dashboard', 
    icon: BarChart3, 
    path: '/insights/surveys/analysis',
    matchPaths: ['/insights/surveys/analysis']
  },
  { 
    label: 'Análise por Pesquisa', 
    icon: TrendingUp, 
    path: '/insights/surveys/analysis/by-survey',
    matchPaths: ['/insights/surveys/analysis/by-survey']
  },
  { 
    label: 'Base IA', 
    icon: Brain, 
    path: '/insights/surveys/analysis/ai-settings',
    matchPaths: ['/insights/surveys/analysis/ai-settings']
  },
  { 
    label: 'Como Usar', 
    icon: BookOpen, 
    path: '/insights/surveys/analysis/guide',
    matchPaths: ['/insights/surveys/analysis/guide']
  },
];

interface SurveyInsightsSubNavProps {
  rightContent?: React.ReactNode;
}

export function SurveyInsightsSubNav({ rightContent }: SurveyInsightsSubNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(p => currentPath === p || currentPath.startsWith(p + '/'));
    }
    return currentPath === item.path;
  };

  return (
    <div className="border-b border-border bg-card/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* Back to surveys list */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/insights/surveys')}
              className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ClipboardList className="h-4 w-4" />
              Pesquisas
            </button>
            <div className="h-6 w-px bg-border" />
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
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 py-2">
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}
