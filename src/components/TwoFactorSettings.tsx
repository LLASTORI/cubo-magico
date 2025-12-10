import { useState, useEffect } from 'react';
import { useMFA, MFAFactor } from '@/hooks/useMFA';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Smartphone, 
  Mail, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const TwoFactorSettings = () => {
  const { toast } = useToast();
  const {
    loading,
    qrCode,
    secret,
    enrollTOTP,
    verifyTOTPEnrollment,
    unenrollFactor,
    listFactors,
    cancelEnrollment,
  } = useMFA();

  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Load enrolled factors
  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    setLoadingFactors(true);
    const data = await listFactors();
    if (data) {
      setFactors(data.totp || []);
    }
    setLoadingFactors(false);
  };

  const handleEnrollTOTP = async () => {
    setEnrolling(true);
    const result = await enrollTOTP('Cubo Mágico App');
    if (!result.success) {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'Digite o código de 6 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    const result = await verifyTOTPEnrollment(verificationCode);
    if (result.success) {
      setVerificationCode('');
      setEnrolling(false);
      loadFactors();
    }
  };

  const handleUnenroll = async (factorId: string) => {
    const result = await unenrollFactor(factorId);
    if (result.success) {
      loadFactors();
    }
  };

  const handleCancel = () => {
    cancelEnrollment();
    setEnrolling(false);
    setVerificationCode('');
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast({
        title: 'Copiado!',
        description: 'Código secreto copiado para a área de transferência.',
      });
    }
  };

  const verifiedFactors = factors.filter(f => f.status === 'verified');
  const hasActiveTOTP = verifiedFactors.length > 0;

  if (loadingFactors) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasActiveTOTP ? 'bg-green-500/10' : 'bg-muted'}`}>
                <Shield className={`h-6 w-6 ${hasActiveTOTP ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Autenticação de Dois Fatores (2FA)
                  {hasActiveTOTP ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ativado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      <XCircle className="h-3 w-3 mr-1" />
                      Desativado
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Adicione uma camada extra de segurança à sua conta.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasActiveTOTP ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  Sua conta está protegida com autenticação de dois fatores.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                {verifiedFactors.map((factor) => (
                  <div key={factor.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">App Autenticador</p>
                        <p className="text-xs text-muted-foreground">
                          {factor.friendly_name || 'TOTP configurado'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUnenroll(factor.id)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remover'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : enrolling && qrCode ? (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Configure seu autenticador</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Escaneie o QR code com seu app autenticador (Google Authenticator, Authy, etc.)
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img 
                    src={qrCode} 
                    alt="QR Code para 2FA" 
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* Secret Key */}
              <div className="space-y-2">
                <Label className="text-sm">Não consegue escanear? Use este código:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={showSecret ? (secret || '') : '••••••••••••••••'}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Verification */}
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Digite o código de 6 dígitos</Label>
                <div className="flex gap-2">
                  <Input
                    id="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="font-mono text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleVerify}
                    disabled={loading || verificationCode.length !== 6}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar'}
                  </Button>
                </div>
              </div>

              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription>
                  Recomendamos ativar 2FA para proteger sua conta contra acessos não autorizados.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                {/* TOTP Option */}
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">App Autenticador</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Use Google Authenticator, Authy ou similar para gerar códigos de verificação.
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          Recomendado
                        </Badge>
                      </div>
                    </div>
                    <Button onClick={handleEnrollTOTP} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Configurar
                    </Button>
                  </div>
                </div>

                {/* Email OTP Info (coming soon) */}
                <div className="p-4 rounded-lg border border-border opacity-60">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        Código por Email
                        <Badge variant="secondary" className="text-xs">Em breve</Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Receba um código de verificação por email a cada login.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
