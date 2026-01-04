import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ProjectRole = 'owner' | 'manager' | 'operator';
export type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface ProjectInvite {
  id: string;
  project_id: string;
  email: string;
  invited_by: string;
  role: ProjectRole;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  responded_at: string | null;
  project?: {
    name: string;
  };
}

const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: 'Proprietário',
  manager: 'Gerente',
  operator: 'Operador',
};

const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  owner: 3,
  manager: 2,
  operator: 1,
};

export const getRoleLabel = (role: ProjectRole) => ROLE_LABELS[role];

export const canManageRole = (userRole: ProjectRole, targetRole: ProjectRole): boolean => {
  if (userRole === 'owner') return true;
  if (userRole === 'manager' && targetRole === 'operator') return true;
  return false;
};

export const useProjectMembers = (projectId: string | null) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [userRole, setUserRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [maxMembers, setMaxMembers] = useState(5);

  const fetchMembers = useCallback(async () => {
    if (!projectId) {
      setMembers([]);
      setUserRole(null);
      setMaxMembers(5);
      setLoading(false);
      return;
    }

    try {
      // Fetch project's max_members limit
      const { data: projectData } = await supabase
        .from('projects')
        .select('max_members')
        .eq('id', projectId)
        .single();
      
      if (projectData?.max_members) {
        setMaxMembers(projectData.max_members);
      }
      // Fetch members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select(`
          id,
          project_id,
          user_id,
          role,
          joined_at
        `)
        .eq('project_id', projectId)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;

      // Fetch profiles for members
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        const membersWithProfiles = membersData.map(member => ({
          ...member,
          role: member.role as ProjectRole,
          profile: profilesData?.find(p => p.id === member.user_id) || null,
        }));

        setMembers(membersWithProfiles);
        setMemberCount(membersWithProfiles.length);

        // Set current user's role
        const currentUserMember = membersWithProfiles.find(m => m.user_id === user?.id);
        setUserRole(currentUserMember?.role || null);
      } else {
        setMembers([]);
        setUserRole(null);
        setMemberCount(0);
      }

      // Fetch pending invites
      const { data: invitesData } = await supabase
        .from('project_invites')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setInvites((invitesData || []).map(inv => ({
        ...inv,
        role: inv.role as ProjectRole,
        status: inv.status as InviteStatus,
      })));
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, user?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteMember = async (email: string, role: ProjectRole, projectName?: string): Promise<{ error: any }> => {
    if (!projectId || !user) return { error: new Error('Projeto não selecionado') };

    // Check limit
    if (memberCount >= maxMembers) {
      return { error: new Error(`Limite de ${maxMembers} membros atingido`) };
    }

    // Check if already a member
    const existingMember = members.find(m => m.profile?.email === email);
    if (existingMember) {
      return { error: new Error('Usuário já é membro do projeto') };
    }

    // Check for pending invite
    const existingInvite = invites.find(i => i.email === email);
    if (existingInvite) {
      return { error: new Error('Já existe um convite pendente para este email') };
    }

    const { data: insertedInvite, error } = await supabase
      .from('project_invites')
      .insert({
        project_id: projectId,
        email: email.toLowerCase().trim(),
        invited_by: user.id,
        role,
      })
      .select()
      .single();

    if (!error && insertedInvite) {
      // Get inviter profile name
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Um usuário';

      // Send email notification
      try {
        await supabase.functions.invoke('send-invite-email', {
          body: {
            inviteId: insertedInvite.id,
            email: email.toLowerCase().trim(),
            projectName: projectName || 'Projeto',
            inviterName,
            role,
            expiresAt: insertedInvite.expires_at,
          },
        });
      } catch (emailError) {
        console.error('Error sending invite email:', emailError);
        // Don't fail the invite if email fails
      }

      await fetchMembers();
    }

    return { error };
  };

  const cancelInvite = async (inviteId: string): Promise<{ error: any }> => {
    const { error } = await supabase
      .from('project_invites')
      .delete()
      .eq('id', inviteId);

    if (!error) {
      await fetchMembers();
    }

    return { error };
  };

  const removeMember = async (memberId: string): Promise<{ error: any }> => {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (!error) {
      await fetchMembers();
    }

    return { error };
  };

  const updateMemberRole = async (memberId: string, newRole: ProjectRole): Promise<{ error: any }> => {
    const { error } = await supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (!error) {
      await fetchMembers();
    }

    return { error };
  };

  const transferOwnership = async (newOwnerId: string): Promise<{ error: any }> => {
    if (!projectId || !user || userRole !== 'owner') {
      return { error: new Error('Sem permissão') };
    }

    // Update current owner to manager
    const { error: demoteError } = await supabase
      .from('project_members')
      .update({ role: 'manager' })
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (demoteError) return { error: demoteError };

    // Promote new owner
    const { error: promoteError } = await supabase
      .from('project_members')
      .update({ role: 'owner' })
      .eq('project_id', projectId)
      .eq('user_id', newOwnerId);

    if (promoteError) return { error: promoteError };

    await fetchMembers();
    return { error: null };
  };

  const leaveProject = async (): Promise<{ error: any }> => {
    if (!projectId || !user || userRole === 'owner') {
      return { error: new Error('Proprietário não pode sair do projeto') };
    }

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    return { error };
  };

  return {
    members,
    invites,
    userRole,
    loading,
    memberCount,
    maxMembers,
    canInvite: memberCount < maxMembers && (userRole === 'owner' || userRole === 'manager'),
    inviteMember,
    cancelInvite,
    removeMember,
    updateMemberRole,
    transferOwnership,
    leaveProject,
    refresh: fetchMembers,
  };
};

export const useMyInvites = () => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    if (!user?.email) {
      setInvites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_invites')
        .select(`
          *,
          project:projects(name)
        `)
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvites((data || []).map(inv => ({
        ...inv,
        role: inv.role as ProjectRole,
        status: inv.status as InviteStatus,
        project: inv.project as { name: string } | undefined,
      })));
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const acceptInvite = async (invite: ProjectInvite): Promise<{ error: any }> => {
    if (!user) return { error: new Error('Usuário não autenticado') };

    // Update invite status
    const { error: updateError } = await supabase
      .from('project_invites')
      .update({ 
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (updateError) return { error: updateError };

    // Add as member
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: invite.project_id,
        user_id: user.id,
        role: invite.role,
      });

    if (memberError) return { error: memberError };

    // Get full invite data with permissions
    const { data: fullInvite } = await supabase
      .from('project_invites')
      .select('*')
      .eq('id', invite.id)
      .single();

    // Apply permissions from invite if they exist
    if (fullInvite) {
      const permissionsData: Record<string, any> = {
        project_id: invite.project_id,
        user_id: user.id,
      };

      // Copy permission fields from invite
      const permissionFields = [
        'permissions_dashboard', 'permissions_analise', 'permissions_crm',
        'permissions_automacoes', 'permissions_chat_ao_vivo', 'permissions_meta_ads',
        'permissions_ofertas', 'permissions_lancamentos', 'permissions_configuracoes'
      ];

      permissionFields.forEach(field => {
        const areaName = field.replace('permissions_', '');
        if (fullInvite[field]) {
          permissionsData[areaName] = fullInvite[field];
        }
      });

      // Update permissions (the trigger already created the record with defaults)
      await supabase
        .from('project_member_permissions')
        .update(permissionsData)
        .eq('project_id', invite.project_id)
        .eq('user_id', user.id);
    }

    await fetchInvites();
    return { error: null };
  };

  const rejectInvite = async (inviteId: string): Promise<{ error: any }> => {
    const { error } = await supabase
      .from('project_invites')
      .update({ 
        status: 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', inviteId);

    if (!error) {
      await fetchInvites();
    }

    return { error };
  };

  return {
    invites,
    loading,
    acceptInvite,
    rejectInvite,
    refresh: fetchInvites,
  };
};
