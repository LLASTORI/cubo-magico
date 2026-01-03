import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, FileText, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionIdentityProps {
  value: string;
  onChange: (value: string) => void;
  fieldType?: string;
  placeholder?: string;
  primaryColor?: string;
  secondaryColor?: string;
  inputTextColor?: string;
}

const fieldIcons: Record<string, any> = {
  name: User,
  first_name: User,
  last_name: User,
  email: Mail,
  phone: Phone,
  city: MapPin,
  state: MapPin,
  country: MapPin,
  document: FileText,
  instagram: AtSign,
};

const fieldPlaceholders: Record<string, string> = {
  name: 'Seu nome completo',
  first_name: 'Seu primeiro nome',
  last_name: 'Seu sobrenome',
  email: 'seu@email.com',
  phone: '(11) 99999-9999',
  city: 'Sua cidade',
  state: 'Seu estado',
  country: 'Seu país',
  document: 'Seu documento (CPF/CNPJ)',
  instagram: '@seu_instagram',
};

export function QuestionIdentity({ 
  value, 
  onChange, 
  fieldType = 'name',
  placeholder,
  primaryColor = '#6366f1',
  secondaryColor = '#64748b',
  inputTextColor = '#1e293b'
}: QuestionIdentityProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = fieldIcons[fieldType] || User;
  const defaultPlaceholder = fieldPlaceholders[fieldType] || 'Sua resposta...';
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative"
    >
      <div className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: secondaryColor }}>
        <Icon className="h-6 w-6" />
      </div>
      <input
        ref={inputRef}
        type={fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || defaultPlaceholder}
        className={cn(
          "w-full bg-transparent border-0 border-b-2 border-muted",
          "focus:border-primary focus:outline-none focus:ring-0",
          "text-xl md:text-2xl font-light",
          "transition-all duration-300 py-4 pl-10 pr-0"
        )}
        style={{ 
          borderColor: value ? primaryColor : secondaryColor,
          '--placeholder-color': `${secondaryColor}80`,
          color: inputTextColor
        } as React.CSSProperties}
      />
      <style>{`
        input::placeholder {
          color: ${secondaryColor}80;
        }
      `}</style>
    </motion.div>
  );
}
