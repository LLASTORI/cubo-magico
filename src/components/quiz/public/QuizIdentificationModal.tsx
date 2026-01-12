import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Instagram, ChevronRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface IdentityFieldConfig {
  enabled: boolean;
  required: boolean;
}

interface IdentitySettings {
  fields: {
    name: IdentityFieldConfig;
    email: IdentityFieldConfig;
    phone: IdentityFieldConfig;
    instagram: IdentityFieldConfig;
  };
  primary_identity_field: 'email' | 'phone';
}

const DEFAULT_IDENTITY_SETTINGS: IdentitySettings = {
  fields: {
    name: { enabled: true, required: false },
    email: { enabled: true, required: true },
    phone: { enabled: true, required: false },
    instagram: { enabled: false, required: false },
  },
  primary_identity_field: 'email',
};

interface QuizIdentificationModalProps {
  isOpen: boolean;
  onSubmit: (data: { name?: string; email?: string; phone?: string; instagram?: string }) => void;
  onSkip?: () => void;
  identitySettings?: IdentitySettings;
}

export function QuizIdentificationModal({ isOpen, onSubmit, onSkip, identitySettings }: QuizIdentificationModalProps) {
  const settings = identitySettings || DEFAULT_IDENTITY_SETTINGS;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    // Validate required fields based on settings
    const { fields } = settings;
    if (fields.email.required && !formData.email.trim()) return;
    if (fields.phone.required && !formData.phone.trim()) return;
    if (fields.name.required && !formData.name.trim()) return;
    if (fields.instagram.required && !formData.instagram.trim()) return;
    
    setIsSubmitting(true);
    onSubmit(formData);
  };

  // Check if form is valid based on required fields
  const isValid = (() => {
    const { fields } = settings;
    if (fields.email.required && !formData.email.trim()) return false;
    if (fields.phone.required && !formData.phone.trim()) return false;
    if (fields.name.required && !formData.name.trim()) return false;
    if (fields.instagram.required && !formData.instagram.trim()) return false;
    // At least one identity field must be provided
    return !!(formData.email.trim() || formData.phone.trim());
  })();

  if (!isOpen) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-xl border p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              Quase lá!
            </h2>
            <p className="text-muted-foreground">
              Preencha seus dados para ver seu resultado personalizado.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {settings.fields.name.enabled && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nome {settings.fields.name.required && '*'}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Seu nome"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {settings.fields.email.enabled && (
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email {settings.fields.email.required && '*'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {settings.fields.phone.enabled && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  WhatsApp {settings.fields.phone.required && '*'}
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {settings.fields.instagram.enabled && (
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  Instagram {settings.fields.instagram.required && '*'}
                </Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@seuusuario"
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              size="lg"
              className="w-full h-12 text-base gap-2"
            >
              Ver meu resultado
              <ChevronRight className="h-5 w-5" />
            </Button>

            {onSkip && (
              <Button
                variant="ghost"
                onClick={onSkip}
                disabled={isSubmitting}
                className="w-full gap-2 text-muted-foreground"
              >
                <SkipForward className="h-4 w-4" />
                Pular e ver resultado
              </Button>
            )}
          </div>

          {/* Privacy note */}
          <p className="text-xs text-center text-muted-foreground">
            Seus dados estão seguros e não serão compartilhados com terceiros.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
