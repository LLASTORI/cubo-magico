import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CuboBrand } from '@/components/CuboLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import { ArrowRight, ArrowLeft, Loader2, Sparkles, Phone, Building, Bell, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileData {
  phone: string;
  phoneCountryCode: string;
  companyName: string;
  companyRole: string;
  whatsappOptIn: boolean;
}

export const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    phone: '',
    phoneCountryCode: '55',
    companyName: '',
    companyRole: '',
    whatsappOptIn: false,
  });

  const totalSteps = 4;

  const handlePhoneChange = (phone: string, countryCode: string) => {
    setProfileData(prev => ({
      ...prev,
      phone,
      phoneCountryCode: countryCode,
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Extract phone parts
      const phoneDigits = profileData.phone.replace(/\D/g, '');
      const countryCodeLength = profileData.phoneCountryCode.length;
      const nationalNumber = phoneDigits.slice(countryCodeLength);
      const ddd = nationalNumber.slice(0, 2);
      const localPhone = nationalNumber.slice(2);

      const { error } = await supabase
        .from('profiles')
        .update({
          phone: localPhone || null,
          phone_ddd: ddd || null,
          phone_country_code: profileData.phoneCountryCode || '55',
          whatsapp_opt_in: profileData.whatsappOptIn,
          company_name: profileData.companyName || null,
          company_role: profileData.companyRole || null,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Erro ao salvar perfil',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    await handleSaveProfile();
    navigate('/projects');
  };

  const handleSkip = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    } finally {
      setLoading(false);
      navigate('/projects');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Bem-vindo ao Cubo Mágico!</h2>
              <p className="text-muted-foreground mt-2">
                Vamos configurar seu perfil para uma melhor experiência.
                Isso leva menos de 1 minuto.
              </p>
            </div>
            <div className="pt-4">
              <Button onClick={() => setStep(2)} className="gap-2">
                Começar <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular por agora
            </button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Contato</h2>
                <p className="text-sm text-muted-foreground">
                  Adicione seu telefone para receber notificações importantes
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp / Telefone</Label>
                <InternationalPhoneInput
                  value={profileData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="whatsapp-opt-in"
                  checked={profileData.whatsappOptIn}
                  onCheckedChange={(checked) => 
                    setProfileData(prev => ({ ...prev, whatsappOptIn: checked === true }))
                  }
                />
                <div className="space-y-1">
                  <label
                    htmlFor="whatsapp-opt-in"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Receber notificações via WhatsApp
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Alertas de vendas, resumos diários e notificações importantes do projeto
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Empresa (opcional)</h2>
                <p className="text-sm text-muted-foreground">
                  Conte-nos sobre você e sua empresa
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nome da Empresa</Label>
                <Input
                  id="company-name"
                  placeholder="Ex: Minha Empresa Ltda"
                  value={profileData.companyName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, companyName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-role">Seu Cargo</Label>
                <Input
                  id="company-role"
                  placeholder="Ex: CEO, Gestor de Tráfego, Analista"
                  value={profileData.companyRole}
                  onChange={(e) => setProfileData(prev => ({ ...prev, companyRole: e.target.value }))}
                />
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="p-4 bg-green-500/10 rounded-full">
                <Check className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Tudo pronto!</h2>
              <p className="text-muted-foreground mt-2">
                Seu perfil está configurado. Agora você pode começar a usar o Cubo Mágico.
              </p>
            </div>

            {profileData.whatsappOptIn && profileData.phone && (
              <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 rounded-lg text-sm">
                <Bell className="h-4 w-4 text-green-600" />
                <span>Notificações via WhatsApp ativadas</span>
              </div>
            )}

            <div className="pt-4">
              <Button onClick={handleComplete} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Acessar Meus Projetos <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 cube-pattern relative">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      {/* Decorative elements */}
      <div className="fixed top-10 left-10 w-20 h-20 bg-cube-blue/10 rounded-lg rotate-12 blur-sm" />
      <div className="fixed bottom-20 right-20 w-16 h-16 bg-cube-orange/10 rounded-lg -rotate-12 blur-sm" />
      
      <Card className="w-full max-w-md shadow-cube border-2 border-primary/20 relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <CuboBrand size="md" />
          </div>
          
          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-colors ${
                  i + 1 <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          <CardDescription>
            Passo {step} de {totalSteps}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="min-h-[320px]">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Navigation buttons for steps 2 and 3 */}
          {step > 1 && step < 4 && (
            <div className="flex justify-between mt-6 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={() => setStep(step + 1)} className="gap-2">
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};