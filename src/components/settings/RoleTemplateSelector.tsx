import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, Briefcase, Target, Users, BarChart2, Headphones,
  MessageCircle, MessageSquare, Zap, Search, Eye, User
} from 'lucide-react';
import { useRoleTemplates, RoleTemplate, PERMISSION_AREA_LABELS, VISIBILITY_MODE_LABELS } from '@/hooks/useRoleTemplates';
import { Skeleton } from '@/components/ui/skeleton';

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  briefcase: Briefcase,
  target: Target,
  users: Users,
  'bar-chart-2': BarChart2,
  headphones: Headphones,
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
  zap: Zap,
  search: Search,
  eye: Eye,
  user: User,
};

interface RoleTemplateSelectorProps {
  value?: string;
  onValueChange: (templateId: string) => void;
  projectId?: string;
  showPreview?: boolean;
  disabled?: boolean;
}

export function RoleTemplateSelector({
  value,
  onValueChange,
  projectId,
  showPreview = true,
  disabled = false,
}: RoleTemplateSelectorProps) {
  const { templates, isLoading } = useRoleTemplates(projectId);
  const selectedTemplate = templates.find(t => t.id === value);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  const getPermissionBadge = (level: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      admin: 'default',
      edit: 'secondary',
      view: 'outline',
      none: 'destructive',
    };
    const labels: Record<string, string> = {
      admin: 'Admin',
      edit: 'Editar',
      view: 'Ver',
      none: 'Sem acesso',
    };
    return (
      <Badge variant={variants[level] || 'outline'} className="text-xs">
        {labels[level] || level}
      </Badge>
    );
  };

  const getActivePermissions = (template: RoleTemplate) => {
    const areas = Object.entries(PERMISSION_AREA_LABELS);
    const active = areas.filter(([key]) => {
      const permKey = `perm_${key}` as keyof RoleTemplate;
      return template[permKey] !== 'none';
    });
    return active.slice(0, 4); // Mostrar no máximo 4
  };

  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um cargo">
            {selectedTemplate && (
              <div className="flex items-center gap-2">
                {ICON_COMPONENTS[selectedTemplate.icon] && 
                  React.createElement(ICON_COMPONENTS[selectedTemplate.icon], { className: 'h-4 w-4' })
                }
                <span>{selectedTemplate.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => {
            const IconComponent = ICON_COMPONENTS[template.icon] || User;
            return (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                      {template.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {showPreview && selectedTemplate && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              {ICON_COMPONENTS[selectedTemplate.icon] && 
                React.createElement(ICON_COMPONENTS[selectedTemplate.icon], { className: 'h-5 w-5 text-primary' })
              }
              <div>
                <h4 className="font-medium">{selectedTemplate.name}</h4>
                <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Permissões principais:</span>
              <div className="flex flex-wrap gap-1">
                {getActivePermissions(selectedTemplate).map(([key, label]) => {
                  const permKey = `perm_${key}` as keyof RoleTemplate;
                  const level = selectedTemplate[permKey] as string;
                  return (
                    <div key={key} className="flex items-center gap-1">
                      <span className="text-xs">{label}:</span>
                      {getPermissionBadge(level)}
                    </div>
                  );
                })}
                {Object.keys(PERMISSION_AREA_LABELS).filter(key => {
                  const permKey = `perm_${key}` as keyof RoleTemplate;
                  return selectedTemplate[permKey] !== 'none';
                }).length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{Object.keys(PERMISSION_AREA_LABELS).filter(key => {
                      const permKey = `perm_${key}` as keyof RoleTemplate;
                      return selectedTemplate[permKey] !== 'none';
                    }).length - 4} mais
                  </Badge>
                )}
              </div>
            </div>

            {selectedTemplate.perm_chat_ao_vivo !== 'none' && (
              <div className="space-y-1 pt-2 border-t">
                <span className="text-xs font-medium text-muted-foreground">Configuração WhatsApp:</span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    {VISIBILITY_MODE_LABELS[selectedTemplate.whatsapp_visibility_mode].label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Máx: {selectedTemplate.whatsapp_max_chats} chats
                  </Badge>
                  {selectedTemplate.whatsapp_is_supervisor && (
                    <Badge className="text-xs">Supervisor</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
