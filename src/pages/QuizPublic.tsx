import { useParams } from 'react-router-dom';
import { QuizRenderer } from '@/components/quiz/public/QuizRenderer';

/**
 * Public quiz page - mobile-first, accessible, modern UX
 * Route: /q/:quizId
 */
export default function QuizPublic() {
  const { quizId } = useParams<{ quizId: string }>();

  if (!quizId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Quiz não encontrado</h1>
          <p className="text-muted-foreground">O link que você acessou não é válido.</p>
        </div>
      </div>
    );
  }

  return <QuizRenderer quizId={quizId} />;
}
