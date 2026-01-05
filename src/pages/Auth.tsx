import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { CuboBrand } from '@/components/CuboLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MFAVerification } from '@/components/MFAVerification';
import { TermsDialog } from '@/components/TermsDialog';
import { logActivityStandalone, updateLastLogin } from '@/hooks/useActivityLog';
import { z } from 'zod';

const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$/;

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
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

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTerms, setShowTerms] = useState(false);
  
  // MFA state
  const [showMFA, setShowMFA] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Check if MFA verification is needed
      checkMFAStatus();
    }
  }, [user]);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      
      // If user has MFA but hasn't verified yet (aal1 but needs aal2)
      if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
        // User needs to complete MFA
        const factorsData = await supabase.auth.mfa.listFactors();
        if (factorsData.data?.totp && factorsData.data.totp.length > 0) {
          const verifiedFactor = factorsData.data.totp.find(f => f.status === 'verified');
          if (verifiedFactor) {
            setMfaFactorId(verifiedFactor.id);
            setShowMFA(true);
            return;
          }
        }
      }
      
      // No MFA needed or already verified, proceed
      if (user) {
        navigate('/projects');
      }
    } catch (error) {
      console.error('Error checking MFA status:', error);
      if (user) {
        navigate('/projects');
      }
    }
  };

  const finalizeLogin = async (emailHint?: string) => {
    try {
      const getSessionOnce = async () => {
        const { data } = await supabase.auth.getSession();
        return data.session;
      };

      let session = await getSessionOnce();
      if (!session) {
        await new Promise((r) => setTimeout(r, 150));
        session = await getSessionOnce();
      }

      const currentUser = session?.user;
      if (!currentUser) return;

      await updateLastLogin();
      await logActivityStandalone(currentUser.id, {
        action: 'login',
        entityType: 'session',
        entityName: currentUser.email || emailHint || '',
      });
    } catch (err) {
      console.error('Failed to finalize login:', err);
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

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password,
    });
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao fazer login',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
        variant: 'destructive',
      });
    } else if (data.user) {
      // Check if MFA is required after login
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
        // Need MFA verification - activity will be logged after MFA success
        const factorsData = await supabase.auth.mfa.listFactors();
        if (factorsData.data?.totp && factorsData.data.totp.length > 0) {
          const verifiedFactor = factorsData.data.totp.find(f => f.status === 'verified');
          if (verifiedFactor) {
            setMfaFactorId(verifiedFactor.id);
            setShowMFA(true);
            return;
          }
        }
      }

      await finalizeLogin(loginData.email);

      toast({
        title: 'Login realizado!',
        description: 'Bem-vindo de volta!',
      });
      navigate('/projects');
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

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: signupData.email,
      password: signupData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: signupData.fullName,
        },
      },
    });

    if (error) {
      setLoading(false);
      if (error.message.includes('already registered')) {
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já possui uma conta. Tente fazer login.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao criar conta',
          description: error.message,
          variant: 'destructive',
        });
      }
      return;
    }

    // Record terms acceptance after successful signup
    if (signUpData.user) {
      try {
        // Try to get client IP
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
          scrolled_to_end: false, // Will be tracked in future with scroll detection
          time_spent_seconds: null,
        });
      } catch (termsError) {
        console.error('Failed to record terms acceptance:', termsError);
        // Don't block signup if terms recording fails
      }
    }

    setLoading(false);
    toast({
      title: 'Conta criada!',
      description: 'Complete seu perfil para uma melhor experiência.',
    });
    navigate('/onboarding');
  };

  const handleMFASuccess = async () => {
    setShowMFA(false);
    setMfaFactorId(null);
    
    await finalizeLogin(loginData.email);

    toast({
      title: 'Login realizado!',
      description: 'Verificação 2FA concluída.',
    });
    navigate('/projects');
  };

  const handleMFACancel = async () => {
    await supabase.auth.signOut();
    setShowMFA(false);
    setMfaFactorId(null);
    setLoginData({ email: '', password: '' });
  };

  // Show MFA verification screen
  if (showMFA && mfaFactorId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 cube-pattern relative">
        <div className="fixed top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        
        <div className="fixed top-10 left-10 w-20 h-20 bg-cube-blue/10 rounded-lg rotate-12 blur-sm" />
        <div className="fixed bottom-20 right-20 w-16 h-16 bg-cube-orange/10 rounded-lg -rotate-12 blur-sm" />
        
        <MFAVerification
          factorId={mfaFactorId}
          onSuccess={handleMFASuccess}
          onCancel={handleMFACancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 cube-pattern relative">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      {/* Decorative cube elements */}
      <div className="fixed top-10 left-10 w-20 h-20 bg-cube-blue/10 rounded-lg rotate-12 blur-sm" />
      <div className="fixed bottom-20 right-20 w-16 h-16 bg-cube-orange/10 rounded-lg -rotate-12 blur-sm" />
      <div className="fixed top-1/3 right-10 w-12 h-12 bg-cube-green/10 rounded-lg rotate-45 blur-sm" />
      
      <Card className="w-full max-w-md shadow-cube border-2 border-primary/20 relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <CuboBrand size="lg" />
          </div>
          <CardDescription className="text-base">
            Gestão Estratégica de Funis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="João Silva"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                  />
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
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
                  <Label htmlFor="signup-confirm">Confirmar senha</Label>
                  <Input
                    id="signup-confirm"
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
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <TermsDialog open={showTerms} onOpenChange={setShowTerms} />
    </div>
  );
};

export default Auth;
