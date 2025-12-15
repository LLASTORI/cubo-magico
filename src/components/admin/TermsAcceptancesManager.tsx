import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, Loader2, CheckCircle, Calendar, Globe, Monitor } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TermsAcceptance {
  id: string;
  user_id: string;
  terms_version: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  user_email?: string;
  user_name?: string;
}

export const TermsAcceptancesManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [acceptances, setAcceptances] = useState<TermsAcceptance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAcceptances();
  }, []);

  const fetchAcceptances = async () => {
    setLoading(true);
    try {
      // Fetch acceptances
      const { data: acceptancesData, error: acceptancesError } = await supabase
        .from('terms_acceptances')
        .select('*')
        .order('accepted_at', { ascending: false });

      if (acceptancesError) throw acceptancesError;

      // Fetch user profiles for enrichment
      const userIds = [...new Set(acceptancesData?.map(a => a.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap: Record<string, { email: string; full_name: string | null }> = {};
      profiles?.forEach(p => {
        profileMap[p.id] = { email: p.email || '', full_name: p.full_name };
      });

      const enrichedAcceptances: TermsAcceptance[] = (acceptancesData || []).map(a => ({
        ...a,
        user_email: profileMap[a.user_id]?.email,
        user_name: profileMap[a.user_id]?.full_name || undefined,
      }));

      setAcceptances(enrichedAcceptances);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar aceites',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAcceptances = acceptances.filter(a =>
    a.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return 'Desconhecido';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Outro';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{acceptances.length}</p>
                <p className="text-xs text-muted-foreground">Total de Aceites</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">v1.0</p>
                <p className="text-xs text-muted-foreground">Versão Atual dos Termos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {acceptances.length > 0 
                    ? format(new Date(acceptances[0].accepted_at), 'dd/MM', { locale: ptBR })
                    : '-'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Último Aceite</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Termos Aceitos</CardTitle>
                <CardDescription>{filteredAcceptances.length} registros encontrados</CardDescription>
              </div>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAcceptances.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum aceite de termos registrado ainda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Data do Aceite</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Navegador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAcceptances.map((acceptance) => (
                  <TableRow key={acceptance.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{acceptance.user_name || 'Sem nome'}</p>
                        <p className="text-sm text-muted-foreground">{acceptance.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        v{acceptance.terms_version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(acceptance.accepted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-mono">
                          {acceptance.ip_address || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        {parseUserAgent(acceptance.user_agent)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
