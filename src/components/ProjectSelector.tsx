import { useNavigate, useLocation, useParams } from 'react-router-dom';
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

/**
 * ProjectSelector REFATORADO para arquitetura canônica.
 * 
 * Agora usa navegação via URL em vez de setar estado global.
 * Ao trocar de projeto, navega para /app/{newProjectCode}/dashboard
 */
const ProjectSelector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectCode: currentProjectCode } = useParams<{ projectCode: string }>();
  const queryClient = useQueryClient();
  const { projects, isProjectReady, getProjectByCode } = useProject();
  
  const isOnConsolidado = location.pathname === '/agencia';
  const currentProject = currentProjectCode ? getProjectByCode(currentProjectCode) : null;

  // Extrai o path após o projectCode para manter o usuário na mesma página
  const getCurrentSubPath = (): string => {
    if (!currentProjectCode) return 'dashboard';
    const match = location.pathname.match(/^\/app\/[^/]+\/(.+)$/);
    return match ? match[1] : 'dashboard';
  };

  const handleSelectProject = (project: Project) => {
    // Skip if same project
    if (project.public_code === currentProjectCode) {
      console.log('[ProjectSelector] Same project selected, skipping');
      return;
    }

    if (!isProjectReady(project.id)) {
      toast.error('Este projeto ainda não está configurado. Configure as credenciais primeiro.');
      navigate('/projects');
      return;
    }
    
    console.log('[ProjectSelector] Navigating to project:', project.name, project.public_code);
    
    // CRITICAL: Clear ALL cached queries before switching project
    queryClient.clear();
    
    // Navegar para o novo projeto mantendo a mesma sub-página
    const subPath = getCurrentSubPath();
    navigate(`/app/${project.public_code}/${subPath}`);
    
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
            const isSelected = project.public_code === currentProjectCode;
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
