import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  public_code: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCredential {
  id: string;
  project_id: string;
  provider: string;
  client_id: string | null;
  client_secret: string | null;
  basic_auth: string | null;
  is_configured: boolean;
  is_validated: boolean;
  validated_at: string | null;
}

interface ProjectCredentialStatus {
  project_id: string;
  is_configured: boolean;
  is_validated: boolean;
}

interface ProjectContextType {
  // Lista de projetos do usuário (para seletor de projetos)
  projects: Project[];
  projectCredentialStatuses: ProjectCredentialStatus[];
  loading: boolean;
  
  // Projeto atual (derivado da URL via setActiveProjectCode)
  currentProject: Project | null;
  credentials: ProjectCredential | null;
  
  // Para ser chamado pelo ProjectLayout quando a URL muda
  setActiveProjectCode: (code: string | null) => void;
  
  // DEPRECATED: Use navegação URL em vez disso
  setCurrentProject: (project: Project | null) => void;
  
  // CRUD de projetos
  createProject: (name: string, description?: string) => Promise<{ data: Project | null; error: any }>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<{ error: any }>;
  deleteProject: (id: string) => Promise<{ error: any }>;
  
  // Credentials
  saveCredentials: (projectId: string, credentials: Partial<ProjectCredential>) => Promise<{ error: any }>;
  markCredentialsValidated: (projectId: string) => Promise<{ error: any }>;
  refreshProjects: () => Promise<void>;
  refreshCredentials: () => Promise<void>;
  isProjectReady: (projectId: string) => boolean;
  
  // Buscar projeto por ID ou código
  getProjectById: (projectId: string) => Project | undefined;
  getProjectByCode: (publicCode: string) => Project | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

/**
 * ProjectProvider com arquitetura canônica.
 * 
 * REGRA DE OURO: O projeto ativo vem da URL (/app/:projectCode/*)
 * O ProjectLayout chama setActiveProjectCode quando a URL muda.
 */
export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectCredentialStatuses, setProjectCredentialStatuses] = useState<ProjectCredentialStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<ProjectCredential | null>(null);
  const [activeProjectCode, setActiveProjectCode] = useState<string | null>(null);
  
  // Derivar currentProject dos projetos carregados + código ativo
  const currentProject = activeProjectCode 
    ? projects.find(p => p.public_code === activeProjectCode) ?? null
    : null;

  // Carregar credenciais quando o projeto atual mudar
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!currentProject) {
        setCredentials(null);
        return;
      }

      const { data, error } = await supabase
        .from('project_credentials')
        .select('*')
        .eq('project_id', currentProject.id)
        .eq('provider', 'hotmart')
        .maybeSingle();

      if (!error && data) {
        setCredentials(data);
      } else {
        setCredentials(null);
      }
    };

    fetchCredentials();
  }, [currentProject?.id]);

  const refreshProjects = async () => {
    if (!user) {
      setProjects([]);
      setProjectCredentialStatuses([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch projects the user owns OR is a member of
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);

      if (ownedError) throw ownedError;

      // Fetch projects where user is a member (but not owner)
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Get full project data for member projects
      let allProjects = ownedProjects || [];
      
      if (memberProjects && memberProjects.length > 0) {
        const memberProjectIds = memberProjects.map(m => m.project_id);
        const { data: memberProjectsData } = await supabase
          .from('projects')
          .select('*')
          .in('id', memberProjectIds);
        
        if (memberProjectsData) {
          // Merge and deduplicate
          const existingIds = new Set(allProjects.map(p => p.id));
          memberProjectsData.forEach(p => {
            if (!existingIds.has(p.id)) {
              allProjects.push(p);
            }
          });
        }
      }

      // Sort by created_at descending
      allProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setProjects(allProjects);
      
      // Fetch credential statuses for all projects
      if (allProjects.length > 0) {
        const projectIds = allProjects.map(p => p.id);
        const { data: credData } = await supabase
          .from('project_credentials')
          .select('project_id, is_configured, is_validated')
          .in('project_id', projectIds);
        
        setProjectCredentialStatuses(credData || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const isProjectReady = (projectId: string): boolean => {
    const status = projectCredentialStatuses.find(s => s.project_id === projectId);
    return status?.is_configured === true && status?.is_validated === true;
  };

  const getProjectById = (projectId: string): Project | undefined => {
    return projects.find(p => p.id === projectId);
  };

  const getProjectByCode = (publicCode: string): Project | undefined => {
    return projects.find(p => p.public_code === publicCode);
  };

  useEffect(() => {
    refreshProjects();
  }, [user]);

  const createProject = async (name: string, description?: string) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name, description } as any)
      .select()
      .single();

    if (!error && data) {
      await refreshProjects();
    }

    return { data, error };
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id);

    if (!error) {
      await refreshProjects();
    }

    return { error };
  };

  const deleteProject = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('delete-project', {
      body: { projectId: id },
    });

    const finalError = error || (data?.error ? new Error(data.error) : null);

    if (!finalError) {
      await refreshProjects();
    }

    return { error: finalError };
  };

  const saveCredentials = async (projectId: string, creds: Partial<ProjectCredential>) => {
    const { error } = await supabase
      .from('project_credentials')
      .upsert({
        project_id: projectId,
        provider: 'hotmart',
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        basic_auth: creds.basic_auth,
        is_configured: !!(creds.client_id && creds.client_secret),
        is_validated: false,
      }, {
        onConflict: 'project_id,provider',
      });

    if (!error) {
      await refreshCredentialStatuses();
    }

    return { error };
  };

  const markCredentialsValidated = async (projectId: string) => {
    const { error } = await supabase
      .from('project_credentials')
      .update({
        is_validated: true,
        validated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('provider', 'hotmart');

    if (!error) {
      await refreshCredentialStatuses();
    }

    return { error };
  };

  const refreshCredentials = async () => {
    if (!currentProject) {
      setCredentials(null);
      return;
    }

    const { data } = await supabase
      .from('project_credentials')
      .select('*')
      .eq('project_id', currentProject.id)
      .eq('provider', 'hotmart')
      .maybeSingle();
    
    if (data) setCredentials(data);
    else setCredentials(null);
  };

  const refreshCredentialStatuses = async () => {
    if (projects.length === 0) return;
    
    const projectIds = projects.map(p => p.id);
    const { data: credData } = await supabase
      .from('project_credentials')
      .select('project_id, is_configured, is_validated')
      .in('project_id', projectIds);
    
    setProjectCredentialStatuses(credData || []);
  };

  // DEPRECATED: setCurrentProject agora é no-op
  const setCurrentProject = (project: Project | null) => {
    console.warn('[ProjectContext] setCurrentProject is deprecated. Use URL navigation instead.');
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      projectCredentialStatuses,
      loading,
      currentProject,
      credentials,
      setActiveProjectCode,
      setCurrentProject,
      createProject,
      updateProject,
      deleteProject,
      saveCredentials,
      markCredentialsValidated,
      refreshProjects,
      refreshCredentials,
      isProjectReady,
      getProjectById,
      getProjectByCode,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
