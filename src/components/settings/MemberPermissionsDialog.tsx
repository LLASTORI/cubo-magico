import { useState, useEffect } from 'react';
import { useMemberPermissions, PERMISSION_AREAS, PERMISSION_LEVELS, PermissionArea, PermissionLevel } from '@/hooks/useMemberPermissions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ShieldCheck, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MemberPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    user_id: string;
    profile?: {
      full_name?: string | null;
      email?: string | null;
      avatar_url?: string | null;
    } | null;
  } | null;
  templateName?: string | null;
}

export function MemberPermissionsDialog({
  open,
  onOpenChange,
  member,
  templateName,
}: MemberPermissionsDialogProps) {
  const { permissions, isLoading, updatePermissions, isUpdating } = useMemberPermissions(member?.user_id);
  const [localPermissions, setLocalPermissions] = useState<Record<PermissionArea, PermissionLevel>>({} as Record<PermissionArea, PermissionLevel>);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (permissions) {
      const perms: Record<PermissionArea, PermissionLevel> = {} as Record<PermissionArea, PermissionLevel>;
      PERMISSION_AREAS.forEach(area => {
        perms[area.key] = permissions[area.key] || 'none';
      });
      setLocalPermissions(perms);
      setHasChanges(false);
    }
  }, [permissions]);

  const handlePermissionChange = (area: PermissionArea, level: PermissionLevel) => {
    setLocalPermissions(prev => ({
      ...prev,
      [area]: level,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!hasChanges) return;
    
    // Build update object with only changed permissions
    const updates: Partial<Record<PermissionArea, PermissionLevel>> = {};
    PERMISSION_AREAS.forEach(area => {
      if (localPermissions[area.key] !== permissions?.[area.key]) {
        updates[area.key] = localPermissions[area.key];
      }
    });

    if (Object.keys(updates).length > 0) {
      updatePermissions(updates);
    }
    
    onOpenChange(false);
  };

  const getPermissionBadgeClass = (level: PermissionLevel) => {
    switch (level) {
      case 'none': return 'bg-muted text-muted-foreground';
      case 'view': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'edit': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'admin': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Permissões Detalhadas
          </DialogTitle>
          <DialogDescription>
            Ajuste as permissões de acesso por área para este membro
          </DialogDescription>
        </DialogHeader>

        {/* Member Info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.profile?.avatar_url || undefined} />
            <AvatarFallback>
              {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">
              {member.profile?.full_name || member.profile?.email || 'Usuário'}
            </p>
            <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
          </div>
          {templateName && (
            <Badge variant="secondary">{templateName}</Badge>
          )}
        </div>

        {templateName && (
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              As permissões base foram definidas pelo cargo <strong>{templateName}</strong>. 
              Você pode ajustar individualmente cada área abaixo.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {PERMISSION_AREAS.map(area => (
                <div 
                  key={area.key} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{area.label}</p>
                    <p className="text-xs text-muted-foreground">{area.description}</p>
                  </div>
                  <Select
                    value={localPermissions[area.key] || 'none'}
                    onValueChange={(value) => handlePermissionChange(area.key, value as PermissionLevel)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue>
                        <Badge className={getPermissionBadgeClass(localPermissions[area.key] || 'none')}>
                          {PERMISSION_LEVELS.find(l => l.value === (localPermissions[area.key] || 'none'))?.label}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PERMISSION_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex flex-col">
                            <span>{level.label}</span>
                            <span className="text-xs text-muted-foreground">{level.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground mr-2">Legenda:</span>
          {PERMISSION_LEVELS.map(level => (
            <Badge key={level.value} className={`text-xs ${getPermissionBadgeClass(level.value)}`}>
              {level.label}
            </Badge>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
          >
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
