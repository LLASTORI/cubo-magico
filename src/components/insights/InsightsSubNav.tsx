import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList, MessageCircle, FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  { 
    label: 'Pesquisas', 
    icon: ClipboardList, 
    path: '/insights/surveys',
    matchPaths: ['/insights/surveys']
  },
  { 
    label: 'Quizzes', 
    icon: FileQuestion, 
    path: '/quizzes',
    matchPaths: ['/quizzes']
  },
  { 
    label: 'Social Listening', 
    icon: MessageCircle, 
    path: '/insights/social',
    matchPaths: ['/insights/social']
  },
];

interface InsightsSubNavProps {
  rightContent?: React.ReactNode;
}

export function InsightsSubNav({ rightContent }: InsightsSubNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(p => currentPath.startsWith(p));
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
            {rightContent}
          </div>
        </div>
      </div>
    </div>
  );
}
