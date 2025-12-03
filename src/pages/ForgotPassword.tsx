import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { CuboBrand } from '@/components/CuboLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
});

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      emailSchema.parse({ email });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao enviar email',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setSent(true);
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 cube-pattern relative">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      <div className="fixed top-10 left-10 w-20 h-20 bg-cube-blue/10 rounded-lg rotate-12 blur-sm" />
      <div className="fixed bottom-20 right-20 w-16 h-16 bg-cube-orange/10 rounded-lg -rotate-12 blur-sm" />
      
      <Card className="w-full max-w-md shadow-cube border-2 border-primary/20 relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <CuboBrand size="lg" />
          </div>
          <CardDescription className="text-base">
            Recuperação de Senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold">Email Enviado!</h3>
              <p className="text-muted-foreground">
                Enviamos um link de recuperação para <strong>{email}</strong>. 
                Verifique sua caixa de entrada e spam.
              </p>
              <Link to="/auth">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <p className="text-sm text-muted-foreground">
                Digite seu email e enviaremos um link para redefinir sua senha.
              </p>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enviar Link de Recuperação
              </Button>

              <Link to="/auth" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Login
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
