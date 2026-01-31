/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UTILITÁRIO CANÔNICO DE FORMATAÇÃO MONETÁRIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * REGRA DE OURO: Moeda é SEMPRE explícita, NUNCA inferida.
 * 
 * Este utilitário é o ÚNICO ponto de formatação monetária do sistema.
 * Todos os componentes devem usar esta função ao exibir valores monetários.
 * 
 * CONTRATO:
 * - currency é OBRIGATÓRIO
 * - NÃO existe moeda default
 * - Em desenvolvimento: lança erro se currency ausente
 * - Em produção: retorna placeholder seguro "—"
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Formata um valor numérico para exibição monetária.
 * 
 * @param value - Valor numérico a ser formatado
 * @param currency - Código ISO 4217 da moeda (ex: "BRL", "USD", "EUR")
 * @returns String formatada com símbolo e separadores corretos
 * 
 * @example
 * formatMoney(1234.56, "BRL") // "R$ 1.234,56"
 * formatMoney(1234.56, "USD") // "US$ 1.234,56" (pt-BR locale)
 * formatMoney(1234.56, "EUR") // "€ 1.234,56" (pt-BR locale)
 */
export function formatMoney(value: number, currency: string): string {
  // Validação estrita: moeda é OBRIGATÓRIA
  if (currency === null || currency === undefined || currency === '') {
    if (import.meta.env.DEV) {
      throw new Error(
        `[formatMoney] Currency is required but received: ${currency}. ` +
        `Value: ${value}. This indicates a bug where currency context is lost.`
      );
    }
    // Em produção, retornar placeholder seguro para não quebrar a UI
    return '—';
  }

  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  } catch (error) {
    // Código de moeda inválido
    if (import.meta.env.DEV) {
      throw new Error(
        `[formatMoney] Invalid currency code: "${currency}". ` +
        `Value: ${value}. Error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
    return '—';
  }
}
