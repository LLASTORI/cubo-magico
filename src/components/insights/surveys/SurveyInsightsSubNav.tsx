import { useLocation } from 'react-router-dom';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { BarChart3, TrendingUp, Brain, BookOpen, ClipboardList, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureGate } from '@/components/FeatureGate';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  matchPaths?: string[];
  featureKey?: string;
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
    matchPaths: ['/insights/surveys/analysis/ai-settings'],
    featureKey: 'ai_analysis.surveys'
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
  const { navigateTo } = useProjectNavigation();
  const location = useLocation();
  const currentPath = location.pathname;

  // Check AI access for survey analysis
  const { hasAccess: hasAIAccess, isLoading: aiAccessLoading } = useFeatureGate('ai_analysis.surveys');

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(p => currentPath === p || currentPath.startsWith(p + '/'));
    }
    return currentPath === item.path;
  };

  const isItemDisabled = (item: NavItem) => {
    if (!item.featureKey) return false;
    if (aiAccessLoading) return false;
    return !hasAIAccess;
  };

  return (
    <div className="border-b border-border bg-card/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* Back to surveys list */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo('/insights/surveys')}
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
                const disabled = isItemDisabled(item);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => !disabled && navigateTo(item.path)}
                    disabled={disabled}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                      active 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                      disabled && "opacity-50 cursor-not-allowed hover:text-muted-foreground hover:border-transparent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {disabled && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
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
