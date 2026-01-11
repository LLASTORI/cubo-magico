import { useParams } from 'react-router-dom';
import { QuizRenderer } from '@/components/quiz/public/QuizRenderer';

/**
 * Public quiz page - mobile-first, accessible, modern UX
 * Routes:
 *   /q/:code/:slug - New multi-tenant route with project code and slug
 *   /q/:quizId - Legacy fallback with UUID
 */
export default function QuizPublic() {
  const { quizId, code, slug } = useParams<{ quizId?: string; code?: string; slug?: string }>();

  // Determine which identifier to use
  // New format: /q/:code/:slug
  // Legacy format: /q/:quizId (UUID)
  const identifier = slug || quizId;
  const projectCode = code;

  if (!identifier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Quiz não encontrado</h1>
          <p className="text-muted-foreground">O link que você acessou não é válido.</p>
        </div>
      </div>
    );
  }

  return <QuizRenderer quizIdentifier={identifier} projectCode={projectCode} />;
}
