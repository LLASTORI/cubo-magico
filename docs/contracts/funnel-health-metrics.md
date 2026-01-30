# Contrato: Funnel Health Metrics

## Objetivo

Definir as 13 métricas de saúde de funil canônicas, suas fontes de dados e regras de cálculo.

## Escopo

Métricas de diagnóstico operacional por funil perpétuo:
- Abandono
- Recuperação
- Reembolso
- Chargeback
- Cancelamento

## Fontes Canônicas

| Métrica | Fonte |
|---------|-------|
| Abandonos | `provider_event_log` (eventos CHECKOUT_STARTED, BILLET_PRINTED sem conversão) |
| Valor Abandonado | `offer_mappings.valor` |
| Recuperação | Cruzamento abandono × compra aprovada (mesmo comprador + produto, janela 7 dias) |
| Reembolsos | `ledger_events` (event_type = 'refund', amount < 0) |
| Chargebacks | `ledger_events` (event_type = 'chargeback') |
| Cancelamentos | `orders.status = 'cancelled'` |
| Vendas Aprovadas | `orders.status IN ('approved', 'complete')` |

## Métricas / Entidades

### Abandono
| Métrica | Definição |
|---------|-----------|
| Total Abandonos | Eventos comportamentais (não financeiros) de início de checkout sem conversão, respeitando janela mínima de 24 horas |
| Valor Abandonado | Soma de `offer_mappings.valor` para abandonos válidos (potencial de receita diagnóstica, não contábil) |
| Abandonos Recuperados | Conversão tardia: abandono seguido de compra aprovada do mesmo comprador e produto/oferta dentro de 7 dias |
| Taxa de Recuperação | `(Recuperados / Total Abandonos) * 100` |

### Reembolso
| Métrica | Definição |
|---------|-----------|
| Total Reembolsos | Quantidade de pedidos únicos com eventos de 'refund' no Ledger |
| Valor Reembolsado | Soma absoluta do `amount` de eventos de reembolso no Ledger |
| Taxa de Reembolso | `(Total Reembolsos / Vendas Aprovadas) * 100` |

### Chargeback
| Métrica | Definição |
|---------|-----------|
| Total Chargebacks | Quantidade de pedidos únicos com eventos de 'chargeback' no Ledger |
| Valor Chargeback | Soma absoluta do `amount` de eventos de chargeback no Ledger |
| Taxa de Chargeback | `(Total Chargebacks / Vendas Aprovadas) * 100` |

### Cancelamento
| Métrica | Definição |
|---------|-----------|
| Total Cancelamentos | Pedidos com status canônico 'cancelled' na tabela `orders` |
| Valor Cancelado | Valor bruto (`customer_paid`) de pedidos cancelled (indicador operacional) |
| Taxa de Cancelamento | `(Total Cancelamentos / Vendas Aprovadas) * 100` |

### Base de Referência
| Métrica | Definição |
|---------|-----------|
| Vendas Aprovadas | Denominador estável para taxas, baseado em pedidos com status 'approved' ou 'complete' |

## Invariantes

1. Toda lógica financeira DEVE ser derivada do Ledger agregado
2. Métricas de abandono são comportamentais, NÃO financeiras
3. Cards de métricas DEVEM sempre ser exibidos, mesmo com valor zero
4. Taxas usam Vendas Aprovadas como denominador estável
5. Reembolso parcial NÃO invalida atribuição de funil se saldo líquido > 0

## O que NÃO faz parte do contrato

- Dependência direta de `hotmart_sales` para métricas de saúde (DEPRECIADO)
- Lógica de atribuição UTM
- Métricas de mídia paga (spend, ROAS, CPA)
- Sincronização com providers externos

## Status

✅ Ativo

---

*Última atualização: 2026-01-30*
