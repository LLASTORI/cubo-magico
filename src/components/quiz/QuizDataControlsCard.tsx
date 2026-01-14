import { useState } from 'react';
import { Trash2, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuizDataControls } from '@/hooks/useQuizDataControls';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface QuizDataControlsCardProps {
  quizId: string;
  quizName: string;
}

export function QuizDataControlsCard({ quizId, quizName }: QuizDataControlsCardProps) {
  const { navigateTo } = useProjectNavigation();
  const { resetQuizData, deleteQuiz } = useQuizDataControls();

  // Fetch sessions count directly from quiz_sessions table
  const { data: sessionsCount = 0, refetch: refetchSessions } = useQuery({
    queryKey: ['quiz-sessions-count', quizId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('quiz_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId);
      
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!quizId,
  });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleResetData = async () => {
    await resetQuizData.mutateAsync(quizId);
    setShowResetDialog(false);
    // Refresh the sessions count after reset
    refetchSessions();
  };

  const handleDeleteQuiz = async () => {
    await deleteQuiz.mutateAsync(quizId);
    setShowDeleteDialog(false);
    navigateTo('/quizzes');
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Controle de Dados
          </CardTitle>
          <CardDescription>
            Ações destrutivas que afetam os dados deste quiz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reset Quiz Data */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
            <div>
              <p className="font-medium text-sm">Limpar Dados do Quiz</p>
              <p className="text-xs text-muted-foreground">
                Remove todas as {sessionsCount} sessões, respostas e resultados. Mantém perguntas e configurações.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowResetDialog(true)}
              disabled={resetQuizData.isPending || sessionsCount === 0}
            >
              {resetQuizData.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Delete Quiz */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/50 bg-destructive/5">
            <div>
              <p className="font-medium text-sm text-destructive">Excluir Quiz Completamente</p>
              <p className="text-xs text-muted-foreground">
                Remove o quiz, todas as perguntas, outcomes e dados de respostas permanentemente.
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteQuiz.isPending}
            >
              {deleteQuiz.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              Limpar Dados do Quiz
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta ação irá apagar permanentemente:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Todas as sessões ({sessionsCount})</li>
                <li>Todas as respostas</li>
                <li>Todos os resultados</li>
                <li>Histórico de perfil cognitivo relacionado</li>
              </ul>
              <p className="font-medium mt-2">
                O quiz "{quizName}" será mantido com suas perguntas e configurações.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetData}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Limpar Dados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Quiz Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta ação é <strong>irreversível</strong> e irá apagar:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>O quiz "{quizName}"</li>
                <li>Todas as perguntas e opções</li>
                <li>Todos os outcomes configurados</li>
                <li>Todas as sessões e respostas</li>
                <li>Todos os resultados</li>
              </ul>
              <p className="font-medium text-destructive mt-3">
                Os perfis cognitivos dos contatos serão recalculados automaticamente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteQuiz}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
