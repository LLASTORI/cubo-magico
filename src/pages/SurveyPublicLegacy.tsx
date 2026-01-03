/**
 * SurveyPublicLegacy
 * 
 * Componente de compatibilidade para URLs antigas no formato /s/:slug
 * 
 * Comportamento:
 * - Busca pesquisa pelo slug
 * - Se encontrar exatamente 1: redireciona para nova URL /s/:code/:slug
 * - Se encontrar 0 ou múltiplas: exibe erro explicativo
 * 
 * ⚠️ LEGADO: Este componente deve ser removido após período de transição.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProjectInfo {
  code: string;
  name: string;
}

interface LegacyResponse {
  project_code?: string;
  error?: string;
  code?: string;
  message?: string;
  projects?: ProjectInfo[];
}

export default function SurveyPublicLegacy() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ambiguousProjects, setAmbiguousProjects] = useState<ProjectInfo[] | null>(null);

  useEffect(() => {
    const resolveLegacyUrl = async () => {
      if (!slug) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      console.log(`[SurveyPublicLegacy] Resolving legacy URL for slug: ${slug}`);

      try {
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-public?slug=${encodeURIComponent(slug)}`;
        const res = await fetch(fnUrl, {
          method: 'GET',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });

        const data: LegacyResponse = await res.json();

        // Conflito: múltiplas pesquisas com mesmo slug
        if (res.status === 409 && data.code === 'AMBIGUOUS_SLUG') {
          console.log('[SurveyPublicLegacy] Ambiguous slug detected');
          setAmbiguousProjects(data.projects || []);
          setError(data.message || 'Este link de pesquisa é ambíguo.');
          setLoading(false);
          return;
        }

        // Não encontrado
        if (!res.ok) {
          setError('Pesquisa não encontrada ou inativa');
          setLoading(false);
          return;
        }

        // Encontrou pesquisa única - redirecionar para nova URL
        if (data.project_code) {
          console.log(`[SurveyPublicLegacy] Redirecting to /s/${data.project_code}/${slug}`);
          navigate(`/s/${data.project_code}/${slug}`, { replace: true });
          return;
        }

        // Fallback: não tem project_code na resposta (não deveria acontecer)
        setError('Erro ao carregar pesquisa. Por favor, use o link atualizado.');
        setLoading(false);
      } catch (err) {
        console.error('[SurveyPublicLegacy] Error:', err);
        setError('Erro ao carregar pesquisa');
        setLoading(false);
      }
    };

    resolveLegacyUrl();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando pesquisa...</p>
        </div>
      </div>
    );
  }

  // Erro com lista de projetos (slug ambíguo)
  if (ambiguousProjects && ambiguousProjects.length > 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Link ambíguo</h1>
            <p className="text-muted-foreground">
              Existem múltiplas pesquisas com este identificador em projetos diferentes.
            </p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Selecione o projeto correto:</p>
            <div className="space-y-2">
              {ambiguousProjects.map((project) => (
                <Button
                  key={project.code}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate(`/s/${project.code}/${slug}`)}
                >
                  <span>{project.name}</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Se você recebeu este link, por favor solicite o link atualizado ao remetente.
          </p>
        </div>
      </div>
    );
  }

  // Erro genérico
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold">Pesquisa não encontrada</h1>
        <p className="text-muted-foreground max-w-sm">
          {error || 'Esta pesquisa pode ter sido desativada ou o link está incorreto.'}
        </p>
      </div>
    </div>
  );
}
