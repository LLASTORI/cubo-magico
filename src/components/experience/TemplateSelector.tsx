/**
 * Experience Engine - Template Selector
 * 
 * Allows users to select from system and custom layout templates.
 */

import { useState } from 'react';
import { Layout, Check, Smartphone, Monitor, Layers, Grid3X3, Minimize2, Film, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useExperienceTemplates, ExperienceTemplateRecord, TemplateConfig } from '@/hooks/useExperienceTemplates';

interface TemplateSelectorProps {
  selectedTemplateId?: string | null;
  onTemplateSelect: (template: ExperienceTemplateRecord) => void;
}

const templateIcons: Record<string, React.ReactNode> = {
  conversational: <Layers className="h-5 w-5" />,
  card: <Grid3X3 className="h-5 w-5" />,
  minimal: <Minimize2 className="h-5 w-5" />,
  story: <Film className="h-5 w-5" />,
  diagnostic: <Stethoscope className="h-5 w-5" />,
};

const templatePreviewColors: Record<string, string> = {
  conversational: 'from-blue-500 to-purple-500',
  card: 'from-green-500 to-teal-500',
  minimal: 'from-gray-500 to-slate-500',
  story: 'from-pink-500 to-rose-500',
  diagnostic: 'from-indigo-500 to-blue-500',
};

export function TemplateSelector({ selectedTemplateId, onTemplateSelect }: TemplateSelectorProps) {
  const { templates, systemTemplates, projectTemplates, isLoading } = useExperienceTemplates();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layout className="h-5 w-5" />
            Layout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layout className="h-5 w-5" />
          Template de Layout
        </CardTitle>
        <CardDescription>
          Escolha a estrutura visual e navegação do seu quiz
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Templates */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Templates do Sistema</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {systemTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onSelect={() => onTemplateSelect(template)}
              />
            ))}
          </div>
        </div>

        {/* Project Templates (if any) */}
        {projectTemplates.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Seus Templates</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {projectTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplateId === template.id}
                  onSelect={() => onTemplateSelect(template)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TemplateCardProps {
  template: ExperienceTemplateRecord;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  const icon = templateIcons[template.slug] || <Layout className="h-5 w-5" />;
  const gradientClass = templatePreviewColors[template.slug] || 'from-gray-500 to-gray-600';

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative rounded-lg border-2 p-3 cursor-pointer transition-all hover:shadow-md",
        isSelected 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}

      {/* Preview area */}
      <div className={cn(
        "h-16 rounded-md mb-3 flex items-center justify-center bg-gradient-to-br",
        gradientClass
      )}>
        <div className="text-white/90">{icon}</div>
      </div>

      {/* Template info */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm">{template.name}</span>
          {template.is_system && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              Sistema
            </Badge>
          )}
        </div>
        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}
      </div>

      {/* Layout indicators */}
      <div className="flex items-center gap-1 mt-2">
        <LayoutIndicator config={template.config} />
      </div>
    </div>
  );
}

function LayoutIndicator({ config }: { config: TemplateConfig }) {
  const indicators = [
    { key: 'layout', label: config.layout },
    { key: 'animation', label: config.animation },
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {indicators.map(ind => (
        <span
          key={ind.key}
          className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
        >
          {ind.label}
        </span>
      ))}
    </div>
  );
}
