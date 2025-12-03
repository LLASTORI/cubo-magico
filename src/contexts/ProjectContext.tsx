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

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  credentials: ProjectCredential | null;
  loading: boolean;
  setCurrentProject: (project: Project | null) => void;
  createProject: (name: string, description?: string) => Promise<{ data: Project | null; error: any }>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<{ error: any }>;
  deleteProject: (id: string) => Promise<{ error: any }>;
  saveCredentials: (projectId: string, credentials: Partial<ProjectCredential>) => Promise<{ error: any }>;
  markCredentialsValidated: (projectId: string) => Promise<{ error: any }>;
  refreshProjects: () => Promise<void>;
  refreshCredentials: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [credentials, setCredentials] = useState<ProjectCredential | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProjects = async () => {
    if (!user) {
      setProjects([]);
      setCurrentProject(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      
      // Auto-select first project if none selected
      if (data && data.length > 0 && !currentProject) {
        setCurrentProject(data[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      credentials,
      loading,
      setCurrentProject,
      createProject,
      updateProject,
      deleteProject,
      saveCredentials,
      markCredentialsValidated,
      refreshProjects,
      refreshCredentials,
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
