import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { cn } from '@/lib/utils';

interface InternationalPhoneInputProps {
  value: string;
  onChange: (phone: string, countryCode: string, countryIso: string) => void;
  defaultCountry?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Helper to parse phone components from full E.164 number
export function parsePhoneNumber(fullPhone: string): { countryCode: string; areaCode: string; localNumber: string } {
  // Remove all non-digits
  const digits = fullPhone.replace(/\D/g, '');
  
  // Common country codes and their lengths
  const countryCodes: Record<string, number> = {
    '1': 1,      // USA/Canada
    '55': 2,     // Brazil
    '351': 3,    // Portugal
    '34': 2,     // Spain
    '44': 2,     // UK
    '49': 2,     // Germany
    '33': 2,     // France
    '39': 2,     // Italy
    '81': 2,     // Japan
    '86': 2,     // China
    '91': 2,     // India
    '52': 2,     // Mexico
    '54': 2,     // Argentina
    '56': 2,     // Chile
    '57': 2,     // Colombia
    '58': 2,     // Venezuela
    '593': 3,    // Ecuador
    '51': 2,     // Peru
    '598': 3,    // Uruguay
    '595': 3,    // Paraguay
    '591': 3,    // Bolivia
  };
  
  // Try to match country code
  for (const [code, length] of Object.entries(countryCodes)) {
    if (digits.startsWith(code)) {
      const remaining = digits.slice(length);
      
      // For Brazil, extract DDD (area code)
      if (code === '55' && remaining.length >= 2) {
        return {
          countryCode: code,
          areaCode: remaining.slice(0, 2),
          localNumber: remaining.slice(2)
        };
      }
      
      // For other countries, no area code separation
      return {
        countryCode: code,
        areaCode: '',
        localNumber: remaining
      };
    }
  }
  
  // Default: assume Brazil if starts with valid DDD
  const brazilDDDs = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
  
  if (digits.length >= 2 && brazilDDDs.includes(digits.slice(0, 2))) {
    return {
      countryCode: '55',
      areaCode: digits.slice(0, 2),
      localNumber: digits.slice(2)
    };
  }
  
  // Fallback: no country code detected
  return {
    countryCode: '',
    areaCode: '',
    localNumber: digits
  };
}

// Helper to format phone for display
export function formatPhoneForDisplay(countryCode: string, areaCode: string, phone: string): string {
  if (!phone && !areaCode) return '';
  
  const parts = [];
  if (countryCode) parts.push(`+${countryCode}`);
  if (areaCode) parts.push(areaCode);
  if (phone) parts.push(phone);
  
  return parts.join(' ');
}

// Helper to get full phone number for WhatsApp
export function getFullPhoneNumber(countryCode: string, areaCode: string, phone: string): string {
  return `${countryCode || '55'}${areaCode || ''}${phone || ''}`.replace(/\D/g, '');
}

export function InternationalPhoneInput({ 
  value, 
  onChange, 
  defaultCountry = 'br',
  placeholder = 'Telefone',
  className,
  disabled
}: InternationalPhoneInputProps) {
  const handleChange = (phone: string, meta: { country: { iso2: string; dialCode: string } }) => {
    onChange(phone, meta.country.dialCode, meta.country.iso2);
  };

  return (
    <div className={cn("international-phone-wrapper", className)}>
      <PhoneInput
        defaultCountry={defaultCountry}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        inputClassName="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        countrySelectorStyleProps={{
          buttonClassName: "h-9 rounded-l-md border border-input bg-background px-2 hover:bg-accent",
        }}
      />
      <style>{`
        .international-phone-wrapper .react-international-phone-input-container {
          display: flex;
          width: 100%;
        }
        .international-phone-wrapper .react-international-phone-input {
          flex: 1;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border-color: hsl(var(--input));
        }
        .international-phone-wrapper .react-international-phone-input:focus {
          outline: none;
          ring: 1px;
          ring-color: hsl(var(--ring));
        }
        .international-phone-wrapper .react-international-phone-country-selector-button {
          background: hsl(var(--background));
          border-color: hsl(var(--input));
          border-right: none;
        }
        .international-phone-wrapper .react-international-phone-country-selector-button:hover {
          background: hsl(var(--accent));
        }
        .international-phone-wrapper .react-international-phone-country-selector-dropdown {
          background: hsl(var(--popover));
          color: hsl(var(--popover-foreground));
          border-color: hsl(var(--border));
          border-radius: var(--radius);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          max-height: 300px;
          overflow-y: auto;
        }
        .international-phone-wrapper .react-international-phone-country-selector-dropdown__list-item {
          padding: 8px 12px;
        }
        .international-phone-wrapper .react-international-phone-country-selector-dropdown__list-item:hover {
          background: hsl(var(--accent));
        }
        .international-phone-wrapper .react-international-phone-country-selector-dropdown__list-item--focused {
          background: hsl(var(--accent));
        }
      `}</style>
    </div>
  );
}
