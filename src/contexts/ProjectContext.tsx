import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
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
  projects: Project[];
  currentProject: Project | null;
  credentials: ProjectCredential | null;
  projectCredentialStatuses: ProjectCredentialStatus[];
  loading: boolean;
  setCurrentProject: (project: Project | null) => void;
  createProject: (name: string, description?: string) => Promise<{ data: Project | null; error: any }>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<{ error: any }>;
  deleteProject: (id: string) => Promise<{ error: any }>;
  saveCredentials: (projectId: string, credentials: Partial<ProjectCredential>) => Promise<{ error: any }>;
  markCredentialsValidated: (projectId: string) => Promise<{ error: any }>;
  refreshProjects: () => Promise<void>;
  refreshCredentials: () => Promise<void>;
  isProjectReady: (projectId: string) => boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const CURRENT_PROJECT_KEY = 'lovable_current_project_id';

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [credentials, setCredentials] = useState<ProjectCredential | null>(null);
  const [projectCredentialStatuses, setProjectCredentialStatuses] = useState<ProjectCredentialStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Wrapper to persist currentProject to localStorage
  const setCurrentProject = (project: Project | null) => {
    setCurrentProjectState(project);
    if (project) {
      localStorage.setItem(CURRENT_PROJECT_KEY, project.id);
    } else {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  };

  const refreshProjects = async () => {
    if (!user) {
      setProjects([]);
      setCurrentProject(null);
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
      const data = allProjects;

      setProjects(data || []);
      
      // Fetch credential statuses for all projects
      if (data && data.length > 0) {
        const projectIds = data.map(p => p.id);
        const { data: credData } = await supabase
          .from('project_credentials')
          .select('project_id, is_configured, is_validated')
          .in('project_id', projectIds);
        
        setProjectCredentialStatuses(credData || []);
        
        // Auto-select project: first try to restore from localStorage, then pick first validated
        if (!currentProject) {
          const savedProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
          const savedProject = savedProjectId ? data.find(p => p.id === savedProjectId) : null;
          
          if (savedProject) {
            setCurrentProject(savedProject);
          } else {
            const validatedProject = data.find(p => 
              credData?.some(c => c.project_id === p.id && c.is_validated)
            );
            setCurrentProject(validatedProject || data[0]);
          }
        }
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

  // Fetch credentials when project changes
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
  }, [currentProject]);

  useEffect(() => {
    refreshProjects();
  }, [user]);

  const createProject = async (name: string, description?: string) => {
    if (!user) return { data: null, error: new Error('User not authenticated') };

    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name, description })
      .select()
      .single();

    if (!error && data) {
      await refreshProjects();
      setCurrentProject(data);
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
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (!error) {
      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
      await refreshProjects();
    }

    return { error };
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
        is_validated: false, // Reset validation when credentials change
      }, {
        onConflict: 'project_id,provider',
      });

    if (!error) {
      await refreshCredentials();
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
      await refreshCredentials();
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

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      credentials,
      projectCredentialStatuses,
      loading,
      setCurrentProject,
      createProject,
      updateProject,
      deleteProject,
      saveCredentials,
      markCredentialsValidated,
      refreshProjects,
      refreshCredentials,
      isProjectReady,
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
