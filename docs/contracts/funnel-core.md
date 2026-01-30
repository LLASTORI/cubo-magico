# Contrato: Funnel Core

## Objetivo

Definir o modelo semântico de Funil e suas regras de agregação de ofertas.

## Escopo

Estrutura conceitual de funis perpétuos e de lançamento, incluindo posições de oferta e atribuição.

## Fontes Canônicas

| Entidade | Tabela |
|----------|--------|
| Funil | `funnels` |
| Mapeamento de Ofertas | `offer_mappings` |
| Pedidos | `orders` |
| Itens de Pedido | `order_items` |
| Ledger | `ledger_events` |

## Métricas / Entidades

### Funil
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| name | string | Nome do funil |
| funnel_type | enum | 'perpetuo' ou 'lancamento' |
| project_id | uuid | Projeto associado |
| campaign_pattern | string | Padrão de nomenclatura para match com campanhas |
| roas_goal | number | Meta de ROAS |

### Posições de Oferta
| Posição | Código | Descrição |
|---------|--------|-----------|
| Front-End | FRONT, FE | Oferta principal de entrada |
| Order Bump | OB | Oferta adicional no checkout |
| Upsell | US | Oferta pós-compra |
| Downsell | DS | Oferta alternativa de menor valor |

### Atribuição de Oferta
| Campo | Fonte | Descrição |
|-------|-------|-----------|
| funnel_id | `offer_mappings.funnel_id` | UUID do funil |
| id_funil | `offer_mappings.id_funil` | Nome legado (sincronizado com funnel.name) |
| codigo_oferta | `offer_mappings.codigo_oferta` | Código único da oferta |
| tipo_posicao | `offer_mappings.tipo_posicao` | Posição no funil |
| id_produto | `offer_mappings.id_produto` | Código do produto |

## Invariantes

1. Funil é agregação semântica de ofertas via `offer_mappings`
2. Identidade única de oferta: `(project_id, provider, codigo_oferta)`
3. Campo `id_funil` (string) DEVE permanecer sincronizado com `funnel.name`
4. Reembolso parcial (ex: Order Bump) NÃO invalida atribuição de funil se saldo líquido > 0
5. `order_items` sem `funnel_id` devem resolver via lookup em `offer_mappings`
6. Ofertas desconhecidas são criadas automaticamente com `origem: 'sale_fallback'`
7. Sincronização via API enriquece metadados, NUNCA sobrescreve `funnel_id` manual

## O que NÃO faz parte do contrato

- Métricas de mídia paga (ver: paid-media-domain.md)
- Métricas de saúde (ver: funnel-health-metrics.md)
- Lógica de processamento de webhook
- Geração de ledger

## Status

✅ Ativo

---

*Última atualização: 2026-01-30*
