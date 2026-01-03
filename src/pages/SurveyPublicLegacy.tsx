/**
 * SurveyPublicLegacy
 * 
 * Componente de compatibilidade para URLs antigas no formato /s/:slug
 * 
 * SEGURANÇA MULTI-TENANT:
 * - NUNCA expor lista de projetos
 * - NUNCA permitir inferência de tenants
 * - Falhar com segurança quando houver ambiguidade
 * 
 * Comportamento:
 * - Busca pesquisa pelo slug
 * - Se encontrar exatamente 1: redireciona para nova URL /s/:code/:slug
 * - Se encontrar 0 ou múltiplas: exibe mensagem neutra sem expor dados
 * 
 * ⚠️ LEGADO: Este componente deve ser removido após período de transição.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function SurveyPublicLegacy() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const resolveLegacyUrl = async () => {
      if (!slug) {
        setError(true);
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

        const data = await res.json();

        // Qualquer erro (não encontrado, ambíguo, etc) = mensagem neutra
        if (!res.ok) {
          console.log('[SurveyPublicLegacy] Error or ambiguous slug');
          setError(true);
          setLoading(false);
          return;
        }

        // Encontrou pesquisa única - redirecionar para nova URL
        if (data.project_code) {
          console.log(`[SurveyPublicLegacy] Redirecting to /s/${data.project_code}/${slug}`);
          navigate(`/s/${data.project_code}/${slug}`, { replace: true });
          return;
        }

        // Fallback: não tem project_code na resposta
        setError(true);
        setLoading(false);
      } catch (err) {
        console.error('[SurveyPublicLegacy] Error:', err);
        setError(true);
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

  // Mensagem neutra - NUNCA expor informações sobre projetos ou tenants
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold">Link inválido ou ambíguo</h1>
        <p className="text-muted-foreground">
          Esta URL não pode ser processada. Por favor, solicite o link correto ao remetente.
        </p>
      </div>
    </div>
  );
}
