import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuestionTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  inputTextColor?: string;
}

export function QuestionText({ 
  value, 
  onChange, 
  placeholder = "Digite sua resposta...",
  multiline = true,
  primaryColor = '#6366f1',
  secondaryColor = '#64748b',
  inputTextColor = '#1e293b'
}: QuestionTextProps) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const baseClasses = cn(
    "w-full bg-transparent border-0 border-b-2",
    "focus:outline-none focus:ring-0",
    "text-xl md:text-2xl font-light",
    "transition-all duration-300 py-4 px-0",
    "resize-none"
  );
  
  if (multiline) {
    return (
      <>
        <motion.textarea
          ref={inputRef as any}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClasses}
          rows={3}
          style={{ 
            borderColor: value ? primaryColor : secondaryColor,
            color: inputTextColor
          }}
        />
        <style>{`
          textarea::placeholder {
            color: ${secondaryColor}80;
          }
        `}</style>
      </>
    );
  }
  
  return (
    <>
      <motion.input
        ref={inputRef as any}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={baseClasses}
        style={{ 
          borderColor: value ? primaryColor : secondaryColor,
          color: inputTextColor
        }}
      />
      <style>{`
        input::placeholder {
          color: ${secondaryColor}80;
        }
      `}</style>
    </>
  );
}
