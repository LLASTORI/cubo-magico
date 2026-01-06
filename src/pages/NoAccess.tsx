import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CuboBrand } from '@/components/CuboLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ShieldX, LogOut, ExternalLink, Mail } from 'lucide-react';

const NoAccess = () => {
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  // Hotmart checkout URL - replace with actual URL
  const hotmartCheckoutUrl = 'https://pay.hotmart.com/YOUR_PRODUCT_ID';

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
            <div className="p-4 bg-destructive/10 rounded-full">
              <ShieldX className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl">Acesso Não Autorizado</CardTitle>
          <CardDescription className="text-base mt-2">
            Sua conta não possui acesso ao Cubo Mágico.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="mb-2">Isso pode acontecer porque:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Você ainda não foi convidado para um projeto</li>
              <li>Sua assinatura expirou ou foi cancelada</li>
              <li>Seu convite ainda não foi aceito</li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-center text-muted-foreground">
              Para ter acesso, você pode:
            </p>
            
            <Button 
              className="w-full" 
              onClick={() => window.open(hotmartCheckoutUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Adquirir uma Assinatura
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              ou
            </div>

            <div className="bg-muted/30 rounded-lg p-3 text-sm text-center">
              <Mail className="h-4 w-4 inline mr-2" />
              Peça a um administrador para te convidar para um projeto
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <span>Logado como:</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair da Conta
            </Button>
          </div>

          <div className="text-center">
            <Link to="/auth" className="text-sm text-primary hover:underline">
              Entrar com outra conta
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoAccess;
