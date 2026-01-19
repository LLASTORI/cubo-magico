/**
 * PaymentMethodBadge
 * 
 * Componente para exibição visual de forma de pagamento
 * 
 * REGRAS CANÔNICAS:
 * ✓ payment_method vem SOMENTE do banco (orders.payment_method)
 * ✓ NUNCA inferir pelo valor, status ou outro campo
 * ✓ Se não souber, exibe "Desconhecido" (silêncio > dado errado)
 * ✓ Parcelas SÓ aparecem para cartão de crédito
 */

import { Badge } from "@/components/ui/badge";
import { CreditCard, Zap, FileText, Wallet, HelpCircle } from "lucide-react";

// Payment method types
export type PaymentMethodType = 
  | 'credit_card' 
  | 'pix' 
  | 'billet' 
  | 'paypal' 
  | 'apple_pay' 
  | 'google_pay' 
  | 'wallet' 
  | 'unknown' 
  | null;

interface PaymentMethodBadgeProps {
  paymentMethod: PaymentMethodType | string | null;
  installments?: number | null;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Normalize raw payment type from provider to internal format
export function normalizePaymentMethod(rawPaymentType: string | null): PaymentMethodType {
  if (!rawPaymentType) return 'unknown';
  
  const normalized = rawPaymentType.toLowerCase().replace(/_/g, '');
  
  switch (normalized) {
    case 'creditcard':
    case 'credit_card':
    case 'cartao':
    case 'card':
      return 'credit_card';
    case 'pix':
      return 'pix';
    case 'billet':
    case 'boleto':
    case 'bankslip':
      return 'billet';
    case 'paypal':
      return 'paypal';
    case 'applepay':
    case 'apple_pay':
      return 'apple_pay';
    case 'googlepay':
    case 'google_pay':
      return 'google_pay';
    case 'wallet':
    case 'balance':
      return 'wallet';
    default:
      return 'unknown';
  }
}

// Get icon component for payment method
function getPaymentIcon(method: PaymentMethodType | string | null) {
  const normalizedMethod = typeof method === 'string' ? normalizePaymentMethod(method) : method;
  
  switch (normalizedMethod) {
    case 'credit_card':
      return CreditCard;
    case 'pix':
      return Zap;
    case 'billet':
      return FileText;
    case 'paypal':
    case 'wallet':
    case 'apple_pay':
    case 'google_pay':
      return Wallet;
    default:
      return HelpCircle;
  }
}

// Get display label for payment method
function getPaymentLabel(
  method: PaymentMethodType | string | null, 
  installments?: number | null
): string {
  const normalizedMethod = typeof method === 'string' ? normalizePaymentMethod(method) : method;
  
  switch (normalizedMethod) {
    case 'credit_card':
      if (installments && installments > 1) {
        return `Cartão • ${installments}x`;
      }
      return 'Cartão • 1x';
    case 'pix':
      return 'PIX';
    case 'billet':
      return 'Boleto';
    case 'paypal':
      return 'PayPal';
    case 'apple_pay':
      return 'Apple Pay';
    case 'google_pay':
      return 'Google Pay';
    case 'wallet':
      return 'Saldo';
    case 'unknown':
    default:
      return 'Desconhecido';
  }
}

// Get badge color based on payment method
function getPaymentColor(method: PaymentMethodType | string | null): string {
  const normalizedMethod = typeof method === 'string' ? normalizePaymentMethod(method) : method;
  
  switch (normalizedMethod) {
    case 'credit_card':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'pix':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'billet':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
    case 'paypal':
      return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20';
    case 'apple_pay':
    case 'google_pay':
    case 'wallet':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    case 'unknown':
    default:
      return 'bg-muted text-muted-foreground border-muted';
  }
}

export function PaymentMethodBadge({
  paymentMethod,
  installments,
  showIcon = true,
  size = 'md',
  className = '',
}: PaymentMethodBadgeProps) {
  const Icon = getPaymentIcon(paymentMethod);
  const label = getPaymentLabel(paymentMethod, installments);
  const colorClass = getPaymentColor(paymentMethod);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <Badge 
      variant="outline" 
      className={`${colorClass} ${sizeClasses[size]} ${className} font-medium`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} mr-1`} />}
      {label}
    </Badge>
  );
}

// Export utility functions for use in other components
export { getPaymentLabel, getPaymentColor, getPaymentIcon };
