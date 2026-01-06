import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { CuboBrand } from '@/components/CuboLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TermsDialog } from '@/components/TermsDialog';
import { z } from 'zod';

const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$/;

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(passwordRegex, 'Senha deve conter letras e números'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Você deve aceitar os termos de uso',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
});

interface InviteData {
  id: string;
  email: string;
  role: string;
  project_id: string;
  project_name?: string;
  inviter_name?: string;
}

const AcceptInvite = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [signupData, setSignupData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  
  const [loginData, setLoginData] = useState({
    password: '',
  });

  const inviteToken = searchParams.get('token');
  const inviteEmail = searchParams.get('email');

  useEffect(() => {
    const checkInvite = async () => {
      // Diagnostic logs
      console.log('[AcceptInvite] Starting invite check...');
      console.log('[AcceptInvite] Token from URL:', inviteToken);
      console.log('[AcceptInvite] Email from URL:', inviteEmail);

      if (!inviteToken || !inviteEmail) {
        console.warn('[AcceptInvite] Missing token or email in URL params');
        setCheckingInvite(false);
        return;
      }

      const normalizedEmail = inviteEmail.toLowerCase().trim();
      console.log('[AcceptInvite] Normalized email:', normalizedEmail);

      try {
        console.log('[AcceptInvite] Calling RPC get_project_invite_public...');
        // Use public RPC function to get invite details (works for anonymous users)
        const { data, error } = await supabase.rpc('get_project_invite_public', {
          p_invite_id: inviteToken,
          p_email: normalizedEmail,
        });

        console.log('[AcceptInvite] RPC response - data:', JSON.stringify(data, null, 2));
        console.log('[AcceptInvite] RPC response - error:', error);

        if (error) {
          console.error('[AcceptInvite] RPC error:', error.message, error.code, error.details);
          toast({
            title: 'Erro ao verificar convite',
            description: 'Não foi possível verificar o convite. Tente novamente.',
            variant: 'destructive',
          });
          setCheckingInvite(false);
          return;
        }

        const result = data as { success: boolean; error?: string; invite?: any; has_account?: boolean };
        console.log('[AcceptInvite] Parsed result - success:', result.success, '| error:', result.error, '| has_account:', result.has_account);

        if (!result.success) {
          console.warn('[AcceptInvite] Invite validation failed with error:', result.error);
          let errorTitle = 'Convite inválido';
          let errorDescription = 'Este convite não existe, já foi usado ou expirou.';
          
          if (result.error === 'expired') {
            errorTitle = 'Convite expirado';
            errorDescription = 'Este convite expirou. Solicite um novo convite.';
          } else if (result.error === 'already_used') {
            errorTitle = 'Convite já utilizado';
            errorDescription = 'Este convite já foi aceito anteriormente.';
          } else if (result.error === 'not_found') {
            errorTitle = 'Convite não encontrado';
            errorDescription = 'O convite não foi encontrado. Verifique se o link está correto ou solicite um novo convite.';
          }

          console.log('[AcceptInvite] Showing error toast:', errorTitle, '-', errorDescription);
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: 'destructive',
          });
          setCheckingInvite(false);
          return;
        }

        const inviteInfo = result.invite;
        console.log('[AcceptInvite] Invite found successfully:', inviteInfo);
        setInvite({
          id: inviteInfo.id,
          email: inviteInfo.email,
          role: inviteInfo.role,
          project_id: inviteInfo.project_id,
          project_name: inviteInfo.project_name,
          inviter_name: inviteInfo.inviter_name,
        });

        setHasAccount(result.has_account ?? false);
        console.log('[AcceptInvite] User has existing account:', result.has_account);
      } catch (error) {
        console.error('[AcceptInvite] Unexpected error:', error);
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao verificar o convite.',
          variant: 'destructive',
        });
      } finally {
        setCheckingInvite(false);
      }
    };

    // Normalize email for comparison
    const normalizedInviteEmail = inviteEmail?.toLowerCase().trim();
    const normalizedUserEmail = user?.email?.toLowerCase().trim();

    // If user is already logged in with the right email, accept invite directly
    if (user && normalizedUserEmail === normalizedInviteEmail) {
      acceptInviteForLoggedUser();
    } else {
      checkInvite();
    }
  }, [inviteToken, inviteEmail, user]);

  const acceptInviteForLoggedUser = async () => {
    if (!inviteToken || !user) {
      setCheckingInvite(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('accept_project_invite', {
        p_invite_id: inviteToken,
        p_user_id: user.id,
      });

      if (error) throw error;
      if ((data as any)?.success === false) {
        throw new Error((data as any)?.error || 'Falha ao aceitar convite');
      }

      // Force access re-check (membership/subscription can change during this flow)
      window.dispatchEvent(new Event('access-control:refresh'));

      toast({
        title: 'Convite aceito!',
        description: 'Você agora faz parte do projeto.',
      });

      navigate('/projects', { replace: true });
    } catch (error: any) {
      toast({
        title: 'Erro ao aceitar convite',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setCheckingInvite(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      signupSchema.parse(signupData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }

    if (!invite) return;

    setLoading(true);

    try {
      // Create account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/projects`,
          data: {
            full_name: signupData.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        // Update profile with signup source
        await supabase
          .from('profiles')
          .update({
            signup_source: 'invited',
            account_activated: true,
          })
          .eq('id', signUpData.user.id);

        // Record terms acceptance
        try {
          let clientIp = null;
          try {
            const { data: ipData } = await supabase.functions.invoke('get-client-ip');
            clientIp = ipData?.ip || null;
          } catch (ipError) {
            console.error('Failed to get client IP:', ipError);
          }

          await supabase.from('terms_acceptances').insert({
            user_id: signUpData.user.id,
            terms_version: '1.0',
            ip_address: clientIp,
            user_agent: navigator.userAgent,
            acceptance_method: 'checkbox',
          });
        } catch (termsError) {
          console.error('Failed to record terms acceptance:', termsError);
        }

        // Accept the invite
        const { data: acceptData, error: acceptError } = await supabase.rpc('accept_project_invite', {
          p_invite_id: invite.id,
          p_user_id: signUpData.user.id,
        });

        if (acceptError) throw acceptError;
        if ((acceptData as any)?.success === false) {
          throw new Error((acceptData as any)?.error || 'Falha ao aceitar convite');
        }

        // Force access re-check (membership/subscription can change during this flow)
        window.dispatchEvent(new Event('access-control:refresh'));

        toast({
          title: 'Conta criada com sucesso!',
          description: 'Você agora faz parte do projeto.',
        });

        navigate('/projects', { replace: true });
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      loginSchema.parse(loginData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }

    if (!invite) return;

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password: loginData.password,
      });

      if (signInError) throw signInError;

      // Accept the invite - get current user id from session
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: acceptData, error: acceptError } = await supabase.rpc('accept_project_invite', {
          p_invite_id: invite.id,
          p_user_id: currentUser.id,
        });

        if (acceptError) throw acceptError;
        if ((acceptData as any)?.success === false) {
          throw new Error((acceptData as any)?.error || 'Falha ao aceitar convite');
        }

        // Force access re-check (membership/subscription can change during this flow)
        window.dispatchEvent(new Event('access-control:refresh'));
      }

      toast({
        title: 'Convite aceito!',
        description: 'Você agora faz parte do projeto.',
      });

      navigate('/projects', { replace: true });
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer login',
        description: error.message === 'Invalid login credentials' 
          ? 'Senha incorreta' 
          : error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingInvite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 cube-pattern relative">
        <div className="fixed top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        
        <Card className="w-full max-w-md shadow-cube border-2 border-primary/20 relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <CuboBrand size="lg" />
            </div>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl">Convite Inválido</CardTitle>
            <CardDescription className="text-base mt-2">
              Este convite não existe, já foi usado ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Se você acredita que isso é um erro, entre em contato com quem te enviou o convite.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/auth')}
            >
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'Proprietário',
      manager: 'Gerente',
      operator: 'Visitante',
      admin: 'Administrador',
      editor: 'Editor',
      viewer: 'Visitante',
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 cube-pattern relative">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      {/* Decorative cube elements */}
      <div className="fixed top-10 left-10 w-20 h-20 bg-cube-blue/10 rounded-lg rotate-12 blur-sm" />
      <div className="fixed bottom-20 right-20 w-16 h-16 bg-cube-orange/10 rounded-lg -rotate-12 blur-sm" />
      
      <Card className="w-full max-w-md shadow-cube border-2 border-primary/20 relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <CuboBrand size="lg" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <UserPlus className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">Você foi Convidado!</CardTitle>
          <CardDescription className="text-base mt-2">
            {invite.inviter_name ? `${invite.inviter_name} te convidou` : 'Você foi convidado'} para o projeto <strong>{invite.project_name}</strong> como <strong>{getRoleLabel(invite.role)}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm">
            <span className="text-muted-foreground">Email do convite:</span>
            <span className="ml-2 font-medium">{invite.email}</span>
          </div>

          {hasAccount ? (
            // User already has account - just login
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Já existe uma conta com este email. Faça login para aceitar o convite.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar e Aceitar Convite
              </Button>
            </form>
          ) : (
            // New user - needs to create account
            <form onSubmit={handleSignup} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Crie sua conta para aceitar o convite.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="João Silva"
                  value={signupData.fullName}
                  onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ex: Cubo2024"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres com letras e números</p>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="accept-terms"
                  checked={signupData.acceptTerms}
                  onCheckedChange={(checked) => setSignupData({ ...signupData, acceptTerms: checked === true })}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="accept-terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Li e aceito os{' '}
                    <button
                      type="button"
                      onClick={() => setShowTerms(true)}
                      className="text-primary hover:underline"
                    >
                      Termos de Uso e Política de Privacidade
                    </button>
                  </label>
                  {errors.acceptTerms && <p className="text-sm text-destructive">{errors.acceptTerms}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Conta e Aceitar Convite
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link to="/auth" className="text-sm text-muted-foreground hover:underline">
              Já tem conta com outro email? Fazer login
            </Link>
          </div>
        </CardContent>
      </Card>

      <TermsDialog open={showTerms} onOpenChange={setShowTerms} />
    </div>
  );
};

export default AcceptInvite;
