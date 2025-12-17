import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Bell, Shield, Settings as SettingsIcon, Camera, Loader2, Link2, Facebook, CheckCircle, AlertCircle, ExternalLink, Crown, Sun, Moon, Monitor, Blocks, Users } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CubeLoader } from '@/components/CubeLoader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FullDataSync } from '@/components/FullDataSync';
import { TwoFactorSettings } from '@/components/TwoFactorSettings';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useTheme } from 'next-themes';
import { ProjectModulesManager } from '@/components/settings/ProjectModulesManager';
import { HotmartSettings } from '@/components/settings/HotmartSettings';
import { WhatsAppFullSettings } from '@/components/settings/WhatsAppFullSettings';
import { TeamPermissionsManager } from '@/components/settings/TeamPermissionsManager';

const META_APP_ID = '845927421602166';

const Settings = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSuperAdmin } = useUserPermissions();
  const { theme, setTheme } = useTheme();
  
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Handle OAuth callback params
  useEffect(() => {
    const metaConnected = searchParams.get('meta_connected');
    const metaError = searchParams.get('meta_error');

    if (metaConnected === 'true') {
      toast({
        title: 'Meta conectado!',
        description: 'Sua conta Meta foi conectada com sucesso.',
      });
      searchParams.delete('meta_connected');
      setSearchParams(searchParams);
      queryClient.invalidateQueries({ queryKey: ['meta_credentials'] });
    }

    if (metaError) {
      toast({
        title: 'Erro ao conectar Meta',
        description: metaError,
        variant: 'destructive',
      });
      searchParams.delete('meta_error');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, toast, queryClient]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['user_preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: metaCredentials, isLoading: metaLoading } = useQuery({
    queryKey: ['meta_credentials', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return null;
      const { data, error } = await supabase
        .from('meta_credentials')
        .select('*')
        .eq('project_id', currentProject.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!currentProject?.id,
  });

  // Set initial values when profile loads
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleConnectMeta = async () => {
    if (!currentProject?.id || !user?.id) {
      toast({
        title: 'Erro',
        description: 'Selecione um projeto primeiro.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get signed state from backend for security
      const { data, error } = await supabase.functions.invoke('meta-oauth-state', {
        body: {
          projectId: currentProject.id,
          redirectUrl: window.location.href,
        },
      });

      if (error || !data?.state) {
        throw new Error(error?.message || 'Falha ao gerar estado de autenticação');
      }

      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth-callback`;
      const scope = 'ads_read,ads_management,business_management';
      
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${data.state}&scope=${scope}`;
      
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error initiating Meta OAuth:', error);
      toast({
        title: 'Erro ao conectar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const disconnectMetaMutation = useMutation({
    mutationFn: async () => {
      if (!currentProject?.id) throw new Error('Projeto não selecionado');
      const { error } = await supabase
        .from('meta_credentials')
        .delete()
        .eq('project_id', currentProject.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta_credentials'] });
      toast({
        title: 'Meta desconectado',
        description: 'Sua conta Meta foi desconectada.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq('id', user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Foto atualizada',
        description: 'Sua foto de perfil foi atualizada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (prefs: { email_notifications?: boolean; sales_alerts?: boolean; weekly_report?: boolean }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      // Check if preferences exist
      if (preferences) {
        const { error } = await supabase
          .from('user_preferences')
          .update(prefs)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Insert new preferences
        const { error } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, ...prefs });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_preferences'] });
      toast({
        title: 'Preferências salvas',
        description: 'Suas preferências de notificação foram atualizadas.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar preferências',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }
      if (newPassword.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao alterar senha',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(fullName);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    updatePasswordMutation.mutate();
  };

  const handleTogglePreference = (key: 'email_notifications' | 'sales_alerts' | 'weekly_report', value: boolean) => {
    updatePreferencesMutation.mutate({ [key]: value });
  };

  const isMetaExpired = metaCredentials?.expires_at 
    ? new Date(metaCredentials.expires_at) < new Date()
    : false;

  if (profileLoading || preferencesLoading) {
    return <CubeLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Configurações</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full max-w-3xl ${isSuperAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipe</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <Blocks className="h-4 w-4" />
              <span className="hidden sm:inline">Módulos</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Integrações</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger 
                value="admin" 
                className="flex items-center gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/admin');
                }}
              >
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Avatar'} />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Foto de perfil</p>
                      <p className="text-xs text-muted-foreground">
                        Clique no ícone para alterar sua foto. Max 2MB.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-sm text-muted-foreground">
                      O email não pode ser alterado.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName || profile?.full_name || ''}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Appearance Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência do aplicativo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label>Tema</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        theme === 'light' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Sun className="h-6 w-6" />
                      <span className="text-sm font-medium">Claro</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        theme === 'dark' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Moon className="h-6 w-6" />
                      <span className="text-sm font-medium">Escuro</span>
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        theme === 'system' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Monitor className="h-6 w-6" />
                      <span className="text-sm font-medium">Sistema</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <TeamPermissionsManager />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                  Configure como você deseja receber notificações.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Notificações por email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba atualizações importantes por email.
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={preferences?.email_notifications ?? true}
                    onCheckedChange={(checked) => handleTogglePreference('email_notifications', checked)}
                    disabled={updatePreferencesMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="salesAlerts">Alertas de vendas</Label>
                    <p className="text-sm text-muted-foreground">
                      Seja notificado sobre novas vendas em tempo real.
                    </p>
                  </div>
                  <Switch
                    id="salesAlerts"
                    checked={preferences?.sales_alerts ?? true}
                    onCheckedChange={(checked) => handleTogglePreference('sales_alerts', checked)}
                    disabled={updatePreferencesMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="weeklyReport">Relatório semanal</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba um resumo semanal das suas métricas.
                    </p>
                  </div>
                  <Switch
                    id="weeklyReport"
                    checked={preferences?.weekly_report ?? false}
                    onCheckedChange={(checked) => handleTogglePreference('weekly_report', checked)}
                    disabled={updatePreferencesMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules">
            <ProjectModulesManager />
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="space-y-6">
              {/* Full Data Sync */}
              <FullDataSync />
              {/* Meta Ads Integration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Facebook className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Meta Ads
                          {metaCredentials && !isMetaExpired && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Conectado
                            </Badge>
                          )}
                          {metaCredentials && isMetaExpired && (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Token Expirado
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Conecte suas contas de anúncios do Facebook e Instagram.
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!currentProject ? (
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">
                        Selecione um projeto primeiro para conectar o Meta Ads.
                      </p>
                    </div>
                  ) : metaCredentials && !isMetaExpired ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Usuário conectado:</span>
                          <span className="text-sm font-medium">{metaCredentials.user_name || 'N/A'}</span>
                        </div>
                        {metaCredentials.user_id && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">ID da conta Meta:</span>
                            <span className="text-sm font-medium font-mono">{metaCredentials.user_id}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Projeto:</span>
                          <span className="text-sm font-medium">{currentProject.name}</span>
                        </div>
                        {metaCredentials.expires_at && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Token expira em:</span>
                            <span className="text-sm font-medium">
                              {new Date(metaCredentials.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleConnectMeta}
                          className="flex-1"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Reconectar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => disconnectMetaMutation.mutate()}
                          disabled={disconnectMetaMutation.isPending}
                        >
                          {disconnectMetaMutation.isPending ? 'Desconectando...' : 'Desconectar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">
                          {isMetaExpired 
                            ? 'Seu token do Meta expirou. Reconecte para continuar importando dados.'
                            : 'Conecte sua conta Meta para importar dados de gastos com anúncios e cruzar com seus dados de vendas.'
                          }
                        </p>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Importe gastos por campanha, conjunto e anúncio</li>
                        <li>• Analise ROI e ROAS por funil</li>
                        <li>• Cruze dados de investimento x faturamento</li>
                      </ul>
                      <Button onClick={handleConnectMeta} className="w-full">
                        <Facebook className="h-4 w-4 mr-2" />
                        Conectar com Facebook
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hotmart Integration */}
              <HotmartSettings />

              {/* WhatsApp Integration */}
              <WhatsAppFullSettings />
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="space-y-6">
              {/* Two-Factor Authentication */}
              <TwoFactorSettings />

              {/* Change Password */}
              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>
                    Atualize sua senha para manter sua conta segura.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova senha</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite a nova senha"
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme a nova senha"
                        minLength={6}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending || !newPassword || !confirmPassword}
                    >
                      {updatePasswordMutation.isPending ? 'Alterando...' : 'Alterar senha'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
