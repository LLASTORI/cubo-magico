import { AppHeader } from '@/components/AppHeader';
import { CustomerJourneyAnalysis } from '@/components/crm/CustomerJourneyAnalysis';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function CRM() {
  const { currentProject } = useProject();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="CRM - Jornada do Cliente" />
      
      <main className="container mx-auto px-6 py-8">
        {!currentProject ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                CRM - Análise de Jornada
              </CardTitle>
              <CardDescription>
                Selecione um projeto para visualizar a jornada dos clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Nenhum projeto selecionado. Use o seletor de projetos no cabeçalho para escolher um projeto.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">CRM - Jornada do Cliente</h1>
              <p className="text-muted-foreground">
                Analise o comportamento de compra dos seus clientes e entenda o LTV por ponto de entrada
              </p>
            </div>

            <CustomerJourneyAnalysis />
          </div>
        )}
      </main>
    </div>
  );
}
