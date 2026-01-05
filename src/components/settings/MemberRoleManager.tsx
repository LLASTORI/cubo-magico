import { useState } from 'react';
import { useProjectMembers, ProjectRole, getRoleLabel } from '@/hooks/useProjectMembers';
import { useRoleTemplates, RoleTemplate, useApplyRoleTemplate } from '@/hooks/useRoleTemplates';
import { useProject } from '@/contexts/ProjectContext';
import { RoleTemplateSelector } from './RoleTemplateSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, Crown, Shield, User, Settings2, Loader2, 
  AlertTriangle, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const getRoleIcon = (role: ProjectRole) => {
  switch (role) {
    case 'owner': return <Crown className="w-4 h-4 text-amber-500" />;
    case 'manager': return <Shield className="w-4 h-4 text-blue-500" />;
    case 'operator': return <User className="w-4 h-4 text-muted-foreground" />;
  }
};

export function MemberRoleManager() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  
  const { members, userRole, loading, refresh } = useProjectMembers(projectId || null);
  const { templates } = useRoleTemplates(projectId);
  const applyTemplate = useApplyRoleTemplate();

  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch current role_template_id for members
  const [memberTemplates, setMemberTemplates] = useState<Record<string, string | null>>({});
  
  useState(() => {
    if (!projectId) return;
    
    const fetchMemberTemplates = async () => {
      const { data } = await supabase
        .from('project_members')
        .select('id, role_template_id')
        .eq('project_id', projectId);
      
      if (data) {
        const map: Record<string, string | null> = {};
        data.forEach(m => {
          map[m.id] = m.role_template_id;
        });
        setMemberTemplates(map);
      }
    };
    
    fetchMemberTemplates();
  });

  const handleOpenDialog = (member: typeof members[0]) => {
    setSelectedMember(member);
    setSelectedTemplateId(memberTemplates[member.id] || '');
    setIsDialogOpen(true);
  };

  const handleApplyRole = async () => {
    if (!selectedMember || !selectedTemplateId || !projectId) return;

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    await applyTemplate.mutateAsync({
      memberId: selectedMember.id,
      template: template as RoleTemplate,
      projectId,
    });

    setMemberTemplates(prev => ({
      ...prev,
      [selectedMember.id]: selectedTemplateId,
    }));

    setIsDialogOpen(false);
    refresh();
  };

  const getTemplateName = (memberId: string) => {
    const templateId = memberTemplates[memberId];
    if (!templateId) return null;
    return templates.find(t => t.id === templateId)?.name;
  };

  const membersWithoutTemplate = members.filter(m => 
    m.role !== 'owner' && !memberTemplates[m.id]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const canManage = userRole === 'owner' || userRole === 'manager';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Cargos dos Membros
        </CardTitle>
        <CardDescription>
          Gerencie os cargos e permissões dos membros do projeto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {membersWithoutTemplate.length > 0 && canManage && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <span className="font-medium">{membersWithoutTemplate.length} membro(s)</span> ainda não tem cargo definido. 
              Clique em "Definir Cargo" para configurar suas permissões.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {members.map(member => {
            const templateName = getTemplateName(member.id);
            const isOwner = member.role === 'owner';
            
            return (
              <div 
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.profile?.full_name || member.profile?.email || 'Usuário'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.profile?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isOwner ? (
                    <Badge className="gap-1">
                      <Crown className="w-3 h-3" />
                      Proprietário
                    </Badge>
                  ) : templateName ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {templateName}
                      </Badge>
                      {canManage && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenDialog(member)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        {getRoleIcon(member.role)}
                        {getRoleLabel(member.role)}
                        <span className="text-xs">(legado)</span>
                      </Badge>
                      {canManage && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenDialog(member)}
                        >
                          Definir Cargo
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dialog para definir/alterar cargo */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Definir Cargo</DialogTitle>
              <DialogDescription>
                {selectedMember && (
                  <>Escolha o cargo para {selectedMember.profile?.full_name || selectedMember.profile?.email}</>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <RoleTemplateSelector
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
                projectId={projectId}
                showPreview={true}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleApplyRole}
                disabled={!selectedTemplateId || applyTemplate.isPending}
              >
                {applyTemplate.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Aplicar Cargo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
