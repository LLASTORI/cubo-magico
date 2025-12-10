import { useState } from 'react';
import { useMFA } from '@/hooks/useMFA';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';

interface MFAVerificationProps {
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MFAVerification = ({ factorId, onSuccess, onCancel }: MFAVerificationProps) => {
  const { loading, challengeAndVerify } = useMFA();
  const [code, setCode] = useState('');

  const handleVerify = async () => {
    if (code.length !== 6) return;
    
    const result = await challengeAndVerify(factorId, code);
    if (result.success) {
      onSuccess();
    } else {
      setCode('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle>Verificação em duas etapas</CardTitle>
        <CardDescription>
          Digite o código de 6 dígitos do seu app autenticador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-code">Código de verificação</Label>
          <Input
            id="mfa-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={handleKeyDown}
            placeholder="000000"
            className="font-mono text-center text-2xl tracking-[0.5em] h-14"
            maxLength={6}
            autoFocus
            autoComplete="one-time-code"
          />
        </div>

        <Button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verificando...
            </>
          ) : (
            'Verificar'
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao login
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Abra seu app autenticador (Google Authenticator, Authy, etc.) 
          e digite o código exibido.
        </p>
      </CardContent>
    </Card>
  );
};
