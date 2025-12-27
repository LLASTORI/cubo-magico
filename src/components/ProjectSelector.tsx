import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProject, Project } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, FolderOpen, Settings, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const ProjectSelector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { projects, currentProject, setCurrentProject, isProjectReady } = useProject();
  
  const isOnConsolidado = location.pathname === '/agencia';

  const handleSelectProject = (project: Project) => {
    // Skip if same project
    if (currentProject?.id === project.id) {
      console.log('[ProjectSelector] Same project selected, skipping');
      return;
    }

    if (!isProjectReady(project.id)) {
      toast.error('Este projeto ainda não está configurado. Configure as credenciais primeiro.');
      navigate('/projects');
      return;
    }
    
    console.log('[ProjectSelector] Switching to project:', project.name, project.id);
    
    // CRITICAL: Clear ALL cached queries before switching project
    // This ensures no stale data from previous project is shown
    queryClient.clear();
    
    // CRITICAL: Clear URL params that reference project-specific data (like conversation IDs)
    const currentUrl = new URL(window.location.href);
    const hasProjectParams = currentUrl.searchParams.has('conversation') || 
                             currentUrl.searchParams.has('contact');
    if (hasProjectParams) {
      currentUrl.searchParams.delete('conversation');
      currentUrl.searchParams.delete('contact');
      window.history.replaceState({}, '', currentUrl.pathname);
    }
    
    // Update the current project (this also saves to localStorage)
    setCurrentProject(project);
    
    toast.success(`Projeto alterado para: ${project.name}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            <span className="truncate max-w-[150px]">
              {currentProject?.name || 'Selecionar Projeto'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        {/* Consolidado - visão de todos os projetos */}
        <DropdownMenuItem 
          onClick={() => navigate('/agencia')}
          className={`gap-2 cursor-pointer ${isOnConsolidado ? 'bg-accent' : ''}`}
        >
          <BarChart3 className="w-4 h-4" />
          Consolidado
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Seus Projetos</DropdownMenuLabel>
        {projects.length === 0 ? (
          <DropdownMenuItem disabled>
            Nenhum projeto
          </DropdownMenuItem>
        ) : (
          projects.map((project) => {
            const ready = isProjectReady(project.id);
            const isSelected = currentProject?.id === project.id;
            return (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className={`flex items-center justify-between ${isSelected ? 'bg-accent' : ''} ${!ready ? 'opacity-60' : ''}`}
              >
                <span className="truncate">{project.name}</span>
                {ready ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 ml-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 ml-2" />
                )}
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/projects')}>
          <Settings className="w-4 h-4 mr-2" />
          Gerenciar Projetos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProjectSelector;
