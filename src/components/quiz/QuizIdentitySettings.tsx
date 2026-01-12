import { useEffect, useState } from 'react';
import { User, Mail, Phone, Instagram, AlertCircle, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export interface IdentityFieldConfig {
  enabled: boolean;
  required: boolean;
}

export interface IdentitySettings {
  fields: {
    name: IdentityFieldConfig;
    email: IdentityFieldConfig;
    phone: IdentityFieldConfig;
    instagram: IdentityFieldConfig;
  };
  primary_identity_field: 'email' | 'phone';
}

export const DEFAULT_IDENTITY_SETTINGS: IdentitySettings = {
  fields: {
    name: { enabled: true, required: false },
    email: { enabled: true, required: true },
    phone: { enabled: true, required: false },
    instagram: { enabled: false, required: false },
  },
  primary_identity_field: 'email',
};

interface QuizIdentitySettingsProps {
  settings: IdentitySettings;
  onChange: (settings: IdentitySettings) => void;
  requiresIdentification: boolean;
}

const fieldLabels = {
  name: { label: 'Nome', icon: User, description: 'Nome do lead' },
  email: { label: 'Email', icon: Mail, description: 'Endereço de email' },
  phone: { label: 'WhatsApp', icon: Phone, description: 'Número de telefone' },
  instagram: { label: 'Instagram', icon: Instagram, description: 'Perfil do Instagram' },
};

export function QuizIdentitySettings({ settings, onChange, requiresIdentification }: QuizIdentitySettingsProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate that at least one identity field (email or phone) is required
  useEffect(() => {
    const emailRequired = settings.fields.email.enabled && settings.fields.email.required;
    const phoneRequired = settings.fields.phone.enabled && settings.fields.phone.required;
    
    if (!emailRequired && !phoneRequired) {
      setValidationError('Pelo menos Email ou WhatsApp deve ser obrigatório para identificar o lead.');
    } else {
      setValidationError(null);
    }
    
    // Ensure primary field is valid
    const primaryField = settings.primary_identity_field;
    const primaryFieldConfig = settings.fields[primaryField];
    
    if (!primaryFieldConfig.enabled || !primaryFieldConfig.required) {
      // Auto-correct: switch primary to a valid field
      if (emailRequired) {
        onChange({ ...settings, primary_identity_field: 'email' });
      } else if (phoneRequired) {
        onChange({ ...settings, primary_identity_field: 'phone' });
      }
    }
  }, [settings]);

  const updateField = (field: keyof typeof settings.fields, key: 'enabled' | 'required', value: boolean) => {
    const newFields = { ...settings.fields };
    newFields[field] = { ...newFields[field], [key]: value };
    
    // If disabling a field, also remove required
    if (key === 'enabled' && !value) {
      newFields[field].required = false;
    }
    
    // If making a field required, ensure it's also enabled
    if (key === 'required' && value) {
      newFields[field].enabled = true;
    }
    
    onChange({ ...settings, fields: newFields });
  };

  const updatePrimaryField = (value: 'email' | 'phone') => {
    // Ensure the selected primary field is enabled and required
    const newFields = { ...settings.fields };
    newFields[value] = { enabled: true, required: true };
    
    onChange({
      ...settings,
      fields: newFields,
      primary_identity_field: value,
    });
  };

  if (!requiresIdentification) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Identificação do Lead
          </CardTitle>
          <CardDescription>
            Configure quais dados serão solicitados ao final do quiz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A identificação está desativada. Ative "Requer Identificação" na aba Informações para configurar os campos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Identificação do Lead
        </CardTitle>
        <CardDescription>
          Configure quais dados serão solicitados ao final do quiz para identificar o lead
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Field Configuration */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Campos de Identificação</Label>
          
          <div className="grid gap-3">
            {(Object.keys(fieldLabels) as Array<keyof typeof fieldLabels>).map((field) => {
              const config = settings.fields[field];
              const { label, icon: Icon, description } = fieldLabels[field];
              const isPrimaryCandidate = field === 'email' || field === 'phone';
              const isPrimary = settings.primary_identity_field === field;
              
              return (
                <div
                  key={field}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isPrimary ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{label}</span>
                        {isPrimary && (
                          <Badge variant="default" className="text-xs">
                            <Key className="h-3 w-3 mr-1" />
                            Chave Primária
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${field}-enabled`} className="text-sm text-muted-foreground">
                        Exibir
                      </Label>
                      <Switch
                        id={`${field}-enabled`}
                        checked={config.enabled}
                        onCheckedChange={(checked) => updateField(field, 'enabled', checked)}
                        disabled={isPrimary} // Can't disable primary field
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${field}-required`} className="text-sm text-muted-foreground">
                        Obrigatório
                      </Label>
                      <Switch
                        id={`${field}-required`}
                        checked={config.required}
                        onCheckedChange={(checked) => updateField(field, 'required', checked)}
                        disabled={!config.enabled || isPrimary} // Can't make primary optional
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary Identity Field Selection */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label className="text-base font-medium">Chave Primária do Lead</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Campo usado para identificar e evitar duplicatas. Novos leads serão buscados primeiro por este campo.
            </p>
          </div>
          
          <RadioGroup
            value={settings.primary_identity_field}
            onValueChange={(v) => updatePrimaryField(v as 'email' | 'phone')}
            className="grid grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-2 p-4 rounded-lg border cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="email" id="primary-email" />
              <Label htmlFor="primary-email" className="flex items-center gap-2 cursor-pointer flex-1">
                <Mail className="h-4 w-4" />
                Email
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 rounded-lg border cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="phone" id="primary-phone" />
              <Label htmlFor="primary-phone" className="flex items-center gap-2 cursor-pointer flex-1">
                <Phone className="h-4 w-4" />
                WhatsApp
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm">
            <strong>Resumo:</strong> O lead deverá fornecer{' '}
            {Object.entries(settings.fields)
              .filter(([_, cfg]) => cfg.required)
              .map(([field]) => fieldLabels[field as keyof typeof fieldLabels].label)
              .join(', ') || 'nenhum campo obrigatório'}
            . A busca de duplicatas será feita por{' '}
            <strong>{fieldLabels[settings.primary_identity_field].label}</strong>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
