import { useNavigate } from 'react-router-dom';
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
import { ChevronDown, FolderOpen, Plus, Settings } from 'lucide-react';

const ProjectSelector = () => {
  const navigate = useNavigate();
  const { projects, currentProject, setCurrentProject } = useProject();

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
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
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Seus Projetos</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.length === 0 ? (
          <DropdownMenuItem disabled>
            Nenhum projeto
          </DropdownMenuItem>
        ) : (
          projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => handleSelectProject(project)}
              className={currentProject?.id === project.id ? 'bg-accent' : ''}
            >
              {project.name}
            </DropdownMenuItem>
          ))
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
