/**
 * Utilitários para exibição de país
 * 
 * Converte código ISO de país para emoji de bandeira
 * e fornece nome localizado em português
 */

// Mapeamento de códigos ISO para nomes em português
const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina',
  BR: 'Brasil',
  CL: 'Chile',
  CO: 'Colômbia',
  CR: 'Costa Rica',
  EC: 'Equador',
  MX: 'México',
  PE: 'Peru',
  UY: 'Uruguai',
  VE: 'Venezuela',
  US: 'Estados Unidos',
  CA: 'Canadá',
  ES: 'Espanha',
  PT: 'Portugal',
  IT: 'Itália',
  FR: 'França',
  DE: 'Alemanha',
  GB: 'Reino Unido',
  NL: 'Holanda',
  BE: 'Bélgica',
  CH: 'Suíça',
  AT: 'Áustria',
  AU: 'Austrália',
  NZ: 'Nova Zelândia',
  JP: 'Japão',
  KR: 'Coreia do Sul',
  CN: 'China',
  IN: 'Índia',
  ZA: 'África do Sul',
  AE: 'Emirados Árabes',
  IL: 'Israel',
  PY: 'Paraguai',
  BO: 'Bolívia',
  PA: 'Panamá',
  DO: 'República Dominicana',
  GT: 'Guatemala',
  HN: 'Honduras',
  SV: 'El Salvador',
  NI: 'Nicarágua',
  CU: 'Cuba',
  PR: 'Porto Rico',
  PH: 'Filipinas',
  SG: 'Singapura',
  MY: 'Malásia',
  TH: 'Tailândia',
  ID: 'Indonésia',
  VN: 'Vietnã',
};

/**
 * Converte código ISO de 2 letras para emoji de bandeira
 * @param countryCode Código ISO 3166-1 alpha-2 (ex: "BR", "US", "MX")
 * @returns Emoji da bandeira ou string vazia se inválido
 */
export function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) return '';
  
  const code = countryCode.toUpperCase();
  // Converte cada letra para o caractere regional correspondente
  const flag = code
    .split('')
    .map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65))
    .join('');
  
  return flag;
}

/**
 * Retorna o nome do país em português
 * @param countryCode Código ISO 3166-1 alpha-2
 * @returns Nome do país ou o próprio código se não encontrado
 */
export function getCountryName(countryCode: string | null | undefined): string {
  if (!countryCode) return '';
  const code = countryCode.toUpperCase();
  return COUNTRY_NAMES[code] || code;
}

/**
 * Retorna flag + nome do país formatado
 * @param countryCode Código ISO 3166-1 alpha-2
 * @returns String formatada "🇲🇽 México" ou vazia se não houver código
 */
export function getCountryDisplay(countryCode: string | null | undefined): string {
  if (!countryCode) return '';
  const flag = getCountryFlag(countryCode);
  const name = getCountryName(countryCode);
  return flag ? `${flag} ${name}` : name;
}
