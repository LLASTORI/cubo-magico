import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Calendar, Globe, CheckCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContactSurveyResponses } from '@/hooks/useSurveyResponses';
import { CubeLoader } from '@/components/CubeLoader';

const SOURCE_LABELS: Record<string, string> = {
  public_link: 'Link Público',
  webhook: 'Webhook',
  csv_import: 'CSV Import',
};

interface ContactSurveysTabProps {
  contactId: string;
}

export function ContactSurveysTab({ contactId }: ContactSurveysTabProps) {
  const navigate = useNavigate();
  const { responses, isLoading } = useContactSurveyResponses(contactId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <CubeLoader size="sm" />
      </div>
    );
  }

  if (!responses?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma pesquisa respondida</p>
          <p className="text-sm text-muted-foreground mt-2">
            Quando este contato responder uma pesquisa, as respostas aparecerão aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pesquisas Respondidas
          </CardTitle>
          <CardDescription>
            {responses.length} {responses.length === 1 ? 'pesquisa respondida' : 'pesquisas respondidas'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {responses.map((response) => (
            <div key={response.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{response.surveys?.name || 'Pesquisa sem nome'}</h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(response.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Globe className="h-3 w-3" />
                    {SOURCE_LABELS[response.source] || response.source}
                  </Badge>
                  {response.processed_at && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Processado
                    </Badge>
                  )}
                </div>
              </div>

              {/* Answers Summary */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {Object.keys(response.answers).length} respostas
                </p>
                <div className="grid gap-2">
                  {Object.entries(response.answers).slice(0, 3).map(([questionId, answer]: [string, any]) => (
                    <div key={questionId} className="text-sm">
                      <span className="text-muted-foreground">{answer.question_text || 'Pergunta'}: </span>
                      <span className="font-medium">
                        {typeof answer.value === 'string' 
                          ? answer.value.slice(0, 100) 
                          : JSON.stringify(answer.value).slice(0, 100)}
                        {(answer.value?.length > 100) && '...'}
                      </span>
                    </div>
                  ))}
                  {Object.keys(response.answers).length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{Object.keys(response.answers).length - 3} outras respostas
                    </p>
                  )}
                </div>
              </div>

              {response.surveys?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => navigate(`/surveys/${response.surveys.id}/responses`)}
                >
                  Ver todas as respostas desta pesquisa
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
