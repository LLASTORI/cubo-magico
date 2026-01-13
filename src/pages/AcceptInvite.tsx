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
  const [inviteDebug, setInviteDebug] = useState<any>(null);

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
  const debugEnabled = searchParams.get('debug') === '1';

  // Always show debug info on screen for troubleshooting
  const [debugInfo, setDebugInfo] = useState<any>({
    step: 'init',
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    const checkInvite = async () => {
      // Diagnostic logs
      console.log('[AcceptInvite] Starting invite check...');
      console.log('[AcceptInvite] Token from URL:', inviteToken);
      console.log('[AcceptInvite] Email from URL:', inviteEmail);

      setDebugInfo((prev: any) => ({
        ...prev,
        step: 'starting',
        token: inviteToken,
        email: inviteEmail,
        url: window.location.href,
      }));

      if (debugEnabled) {
        setInviteDebug({
          startedAt: new Date().toISOString(),
          url: window.location.href,
          token: inviteToken,
          email: inviteEmail,
        });
      }

      if (!inviteToken || !inviteEmail) {
        console.warn('[AcceptInvite] Missing token or email in URL params');
        setDebugInfo((prev: any) => ({ ...prev, step: 'missing_params' }));
        setCheckingInvite(false);
        return;
      }

      const normalizedEmail = inviteEmail.toLowerCase().trim();
      console.log('[AcceptInvite] Normalized email:', normalizedEmail);

      setDebugInfo((prev: any) => ({ ...prev, normalizedEmail, step: 'calling_rpc' }));

      if (debugEnabled) {
        setInviteDebug((prev: any) => ({ ...(prev ?? {}), normalizedEmail }));
      }

      try {
        console.log('[AcceptInvite] Calling RPC get_project_invite_public...');
        // Use public RPC function to get invite details (works for anonymous users)
        const { data, error } = await supabase.rpc('get_project_invite_public', {
          p_invite_id: inviteToken,
          p_email: normalizedEmail,
        });

        console.log('[AcceptInvite] RPC response - data:', JSON.stringify(data, null, 2));
        console.log('[AcceptInvite] RPC response - error:', error);

        setDebugInfo((prev: any) => ({
          ...prev,
          step: 'rpc_completed',
          rpcData: data,
          rpcError: error ? { message: error.message, code: (error as any).code } : null,
        }));

        if (debugEnabled) {
          setInviteDebug((prev: any) => ({
            ...(prev ?? {}),
            rpc: {
              data,
              error: error
                ? {
                    message: error.message,
                    code: (error as any).code,
                    details: (error as any).details,
                    hint: (error as any).hint,
                  }
                : null,
            },
          }));
        }

        if (error) {
          console.error('[AcceptInvite] RPC error:', error.message, error.code, error.details);
          setDebugInfo((prev: any) => ({ ...prev, step: 'rpc_error' }));
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

        setDebugInfo((prev: any) => ({
          ...prev,
          step: 'parsing_result',
          resultSuccess: result.success,
          resultError: result.error,
          hasAccount: result.has_account,
        }));

        if (!result.success) {
          console.warn('[AcceptInvite] Invite validation failed with error:', result.error);
          setDebugInfo((prev: any) => ({ ...prev, step: 'invite_invalid', reason: result.error }));
          
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
        setDebugInfo((prev: any) => ({ ...prev, step: 'invite_valid', inviteInfo }));
        
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
      } catch (error: any) {
        console.error('[AcceptInvite] Unexpected error:', error);
        setDebugInfo((prev: any) => ({ ...prev, step: 'exception', errorMessage: error?.message }));
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
      setDebugInfo((prev: any) => ({ ...prev, step: 'user_logged_in_matching', userEmail: normalizedUserEmail }));
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
      // If error is about invite already used/accepted, still redirect - this is expected
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('already') || errorMessage.includes('já') || errorMessage.includes('aceito')) {
        // Invite was already accepted, redirect to projects
        navigate('/projects', { replace: true });
        return;
      }
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

  // Helper function to wait for session to be established
  const waitForSession = async (maxAttempts = 10, delayMs = 500): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[AcceptInvite] Session established after', i + 1, 'attempts');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return false;
  };

  // Helper function to accept invite with retry
  const acceptInviteWithRetry = async (inviteId: string, userId: string, maxRetries = 3): Promise<{ success: boolean; error?: string }> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[AcceptInvite] Attempt ${attempt}/${maxRetries} to accept invite`);
      
      try {
        const { data, error } = await supabase.rpc('accept_project_invite', {
          p_invite_id: inviteId,
          p_user_id: userId,
        });

        if (error) {
          console.error(`[AcceptInvite] RPC error on attempt ${attempt}:`, error);
          if (attempt === maxRetries) {
            return { success: false, error: error.message };
          }
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const result = data as { success: boolean; error?: string };
        if (result?.success === false) {
          // If already accepted, treat as success
          if (result.error?.includes('already') || result.error?.includes('já')) {
            console.log('[AcceptInvite] Invite already accepted, treating as success');
            return { success: true };
          }
          if (attempt === maxRetries) {
            return { success: false, error: result.error };
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        return { success: true };
      } catch (err: any) {
        console.error(`[AcceptInvite] Exception on attempt ${attempt}:`, err);
        if (attempt === maxRetries) {
          return { success: false, error: err.message };
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    return { success: false, error: 'Falha após múltiplas tentativas' };
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
      console.log('[AcceptInvite] Starting signup process for:', invite.email);
      
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

      if (signUpError) {
        console.error('[AcceptInvite] SignUp error:', signUpError);
        throw signUpError;
      }

      console.log('[AcceptInvite] SignUp successful, user:', signUpData.user?.id);

      if (signUpData.user) {
        const userId = signUpData.user.id;
        
        // Wait for session to be fully established (auto-confirm may have race condition)
        console.log('[AcceptInvite] Waiting for session to be established...');
        const sessionEstablished = await waitForSession();
        
        if (!sessionEstablished) {
          console.warn('[AcceptInvite] Session not established, proceeding anyway...');
        }

        // Update profile with signup source
        console.log('[AcceptInvite] Updating profile...');
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            signup_source: 'invited',
            account_activated: true,
          })
          .eq('id', userId);
        
        if (profileError) {
          console.error('[AcceptInvite] Profile update error:', profileError);
        }

        // Record terms acceptance (non-blocking)
        try {
          let clientIp = null;
          try {
            const { data: ipData } = await supabase.functions.invoke('get-client-ip');
            clientIp = ipData?.ip || null;
          } catch (ipError) {
            console.error('[AcceptInvite] Failed to get client IP:', ipError);
          }

          await supabase.from('terms_acceptances').insert({
            user_id: userId,
            terms_version: '1.0',
            ip_address: clientIp,
            user_agent: navigator.userAgent,
            acceptance_method: 'checkbox',
          });
        } catch (termsError) {
          console.error('[AcceptInvite] Failed to record terms acceptance:', termsError);
        }

        // Accept the invite with retry logic
        console.log('[AcceptInvite] Accepting invite...');
        const acceptResult = await acceptInviteWithRetry(invite.id, userId);
        
        if (!acceptResult.success) {
          console.error('[AcceptInvite] Failed to accept invite after retries:', acceptResult.error);
          // Even if invite acceptance fails, the account was created - notify user
          toast({
            title: 'Conta criada!',
            description: 'Sua conta foi criada, mas houve um problema ao aceitar o convite. Entre em contato com o administrador do projeto.',
            variant: 'destructive',
          });
          navigate('/projects', { replace: true });
          return;
        }

        console.log('[AcceptInvite] Invite accepted successfully!');
        
        // Force access re-check (membership/subscription can change during this flow)
        window.dispatchEvent(new Event('access-control:refresh'));

        toast({
          title: 'Conta criada com sucesso!',
          description: 'Você agora faz parte do projeto.',
        });

        navigate('/projects', { replace: true });
      }
    } catch (error: any) {
      console.error('[AcceptInvite] Signup process error:', error);
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
      console.log('[AcceptInvite] Starting login process for:', invite.email);
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password: loginData.password,
      });

      if (signInError) {
        console.error('[AcceptInvite] SignIn error:', signInError);
        throw signInError;
      }

      console.log('[AcceptInvite] Login successful, getting user...');
      
      // Accept the invite - get current user id from session
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        console.log('[AcceptInvite] User ID:', currentUser.id);
        
        // Accept invite with retry logic
        const acceptResult = await acceptInviteWithRetry(invite.id, currentUser.id);
        
        if (!acceptResult.success) {
          console.error('[AcceptInvite] Failed to accept invite:', acceptResult.error);
          // If already a member, just redirect
          toast({
            title: 'Aviso',
            description: acceptResult.error || 'Não foi possível aceitar o convite automaticamente.',
            variant: 'destructive',
          });
          navigate('/projects', { replace: true });
          return;
        }

        console.log('[AcceptInvite] Invite accepted successfully!');
        
        // Force access re-check (membership/subscription can change during this flow)
        window.dispatchEvent(new Event('access-control:refresh'));
      }

      toast({
        title: 'Convite aceito!',
        description: 'Você agora faz parte do projeto.',
      });

      navigate('/projects', { replace: true });
    } catch (error: any) {
      console.error('[AcceptInvite] Login process error:', error);
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

            {/* Always show debug info to troubleshoot the issue */}
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-medium text-amber-600">🔍 Diagnóstico</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const fullDebug = { debugInfo, inviteDebug };
                      await navigator.clipboard.writeText(JSON.stringify(fullDebug, null, 2));
                      toast({ title: 'Diagnóstico copiado!' });
                    } catch (e) {
                      console.error('Failed to copy debug:', e);
                    }
                  }}
                >
                  Copiar
                </Button>
              </div>
              <pre className="whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>

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
