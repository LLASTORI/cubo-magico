import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database, Loader2, CheckCircle } from 'lucide-react';

export function MigrateInteractionsButton() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ interactions_created: number } | null>(null);

  const handleMigrate = async () => {
    if (!currentProject?.id) return;

    setIsMigrating(true);
    try {
      const { data, error } = await supabase.rpc('migrate_hotmart_to_interactions');

      if (error) throw error;

      const result = data?.[0] || { interactions_created: 0 };
      setMigrationResult(result);

      toast({
        title: 'Migração concluída',
        description: `${result.interactions_created} interações foram criadas a partir do histórico.`,
      });
    } catch (error: any) {
      console.error('Migration error:', error);
      toast({
        title: 'Erro na migração',
        description: error.message || 'Erro ao migrar interações',
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (!currentProject) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Migrar Interações Históricas
        </CardTitle>
        <CardDescription>
          Cria registros de interação a partir das transações existentes da Hotmart para popular a jornada dos contatos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button onClick={handleMigrate} disabled={isMigrating}>
            {isMigrating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Migrando...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Executar Migração
              </>
            )}
          </Button>
          {migrationResult && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              {migrationResult.interactions_created} interações criadas
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
