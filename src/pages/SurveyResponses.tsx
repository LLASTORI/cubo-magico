import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Trash2, User, Calendar, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSurvey } from '@/hooks/useSurveys';
import { useSurveyResponses } from '@/hooks/useSurveyResponses';
import { CubeLoader } from '@/components/CubeLoader';

const SOURCE_LABELS: Record<string, string> = {
  public_link: 'Link Público',
  webhook: 'Webhook',
  csv_import: 'CSV Import',
};

export default function SurveyResponses() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { survey } = useSurvey(surveyId);
  const { responses, isLoading, deleteResponse } = useSurveyResponses(surveyId);

  const handleDelete = async (id: string) => {
    if (confirm('Excluir esta resposta?')) {
      await deleteResponse.mutateAsync(id);
    }
  };

  const exportCSV = () => {
    if (!responses || !survey) return;

    const questions = survey.survey_questions || [];
    const headers = ['Email', 'Contato', 'Fonte', 'Data', ...questions.map(q => q.question_text)];
    
    const rows = responses.map(r => {
      const answers = questions.map(q => {
        const answer = r.answers[q.id];
        return answer?.value || '';
      });
      return [
        r.email,
        r.crm_contacts?.name || '',
        SOURCE_LABELS[r.source] || r.source,
        format(new Date(r.submitted_at), 'dd/MM/yyyy HH:mm'),
        ...answers,
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respostas-${survey.name}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Respostas" />
        <div className="flex items-center justify-center h-64">
          <CubeLoader size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Respostas" />
      
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/surveys/${surveyId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{survey?.name}</span>
            <Badge variant="secondary">{responses?.length || 0} respostas</Badge>
          </div>
          <Button variant="outline" onClick={exportCSV} disabled={!responses?.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{responses?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Total de Respostas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {responses?.filter(r => r.source === 'public_link').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Via Link Público</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {responses?.filter(r => r.source === 'webhook').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Via Webhook</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {responses?.filter(r => r.contact_id).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Contatos Vinculados</p>
            </CardContent>
          </Card>
        </div>

        {/* Responses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Respostas Recebidas</CardTitle>
          </CardHeader>
          <CardContent>
            {!responses?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma resposta recebida ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Respostas</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {response.crm_contacts?.name || response.email}
                            </p>
                            <p className="text-xs text-muted-foreground">{response.email}</p>
                          </div>
                        </div>
                        {response.contact_id && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs"
                            onClick={() => navigate(`/crm/contact/${response.contact_id}`)}
                          >
                            Ver no CRM →
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" />
                          {SOURCE_LABELS[response.source] || response.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(response.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {Object.keys(response.answers).length} respostas
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(response.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
