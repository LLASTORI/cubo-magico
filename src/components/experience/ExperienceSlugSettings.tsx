/**
 * Experience Slug Settings
 * 
 * Unified slug configuration for Quiz and Survey.
 */

import { useState, useEffect } from 'react';
import { Link2, Check, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export interface ExperienceSlugSettingsProps {
  slug: string;
  projectId: string;
  experienceId: string;
  onChange: (slug: string) => void;
  type: 'quiz' | 'survey';
  publicCode?: string;
}

export function ExperienceSlugSettings({
  slug,
  projectId,
  experienceId,
  onChange,
  type,
  publicCode,
}: ExperienceSlugSettingsProps) {
  const [localSlug, setLocalSlug] = useState(slug || '');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync local slug with prop when it changes (e.g., after save)
  useEffect(() => {
    setLocalSlug(slug || '');
    // If slug exists and matches, it's already available (current value)
    if (slug) {
      setIsAvailable(true);
    }
  }, [slug]);

  const typeLabel = type === 'quiz' ? 'quiz' : 'pesquisa';
  const routePrefix = type === 'quiz' ? 'q' : 's';

  // Debounced slug check
  useEffect(() => {
    if (!localSlug || localSlug.length < 3) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      setError(null);

      try {
        // Check quizzes table
        const { data: quizMatch } = await supabase
          .from('quizzes')
          .select('id')
          .eq('project_id', projectId)
          .eq('slug', localSlug)
          .neq('id', type === 'quiz' ? experienceId : '')
          .maybeSingle();

        // Check surveys table
        const { data: surveyMatch } = await supabase
          .from('surveys')
          .select('id')
          .eq('project_id', projectId)
          .eq('slug', localSlug)
          .neq('id', type === 'survey' ? experienceId : '')
          .maybeSingle();

        const isTaken = !!(quizMatch || surveyMatch);
        setIsAvailable(!isTaken);
        
        if (isTaken) {
          setError(`Este slug já está em uso por ${quizMatch ? 'um quiz' : 'uma pesquisa'} neste projeto`);
        }
      } catch (err) {
        console.error('Error checking slug:', err);
        setError('Erro ao verificar disponibilidade');
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSlug, projectId, experienceId, type]);

  const handleSlugChange = (value: string) => {
    // Normalize slug: lowercase, no spaces, no special chars except hyphen
    const normalized = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    
    setLocalSlug(normalized);
  };

  const applySlug = () => {
    if (isAvailable && localSlug) {
      onChange(localSlug);
    }
  };

  const baseUrl = typeof window !== 'undefined' 
    ? (window.location.origin.includes('lovable') 
        ? 'https://cubomagico.leandrolastori.com.br' 
        : window.location.origin)
    : '';

  const fullUrl = publicCode && localSlug 
    ? `${baseUrl}/${routePrefix}/${publicCode}/${localSlug}` 
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5" />
          URL Pública
        </CardTitle>
        <CardDescription>
          Configure a URL amigável do seu {typeLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Slug</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={localSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="meu-quiz-incrivel"
                className="pr-10"
              />
              {isChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
              {!isChecking && isAvailable === true && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {!isChecking && isAvailable === false && (
                <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
              )}
            </div>
            <Button 
              onClick={applySlug}
              disabled={!isAvailable || !localSlug || localSlug === slug}
            >
              Aplicar
            </Button>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Use apenas letras minúsculas, números e hífens. Mínimo 3 caracteres.
          </p>
        </div>

        {fullUrl && (
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-xs text-muted-foreground">URL Final</Label>
            <p className="text-sm font-mono break-all mt-1">{fullUrl}</p>
          </div>
        )}

        {!publicCode && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              O projeto precisa ter um código público configurado para gerar URLs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
