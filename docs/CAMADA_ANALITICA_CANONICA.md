# Camada Analítica Canônica - Funil Perpétuo

## Visão Geral

Esta documentação descreve a camada analítica canônica implementada para o módulo de Funil Perpétuo (Análise de Funil). O objetivo é centralizar eventos de venda, padronizar métricas e preparar o sistema para análises por IA no futuro.

---

## 1. Estruturas Criadas

### 1.1 Views

| View | Descrição |
|------|-----------|
| `canonical_sale_events` | View canônica que unifica eventos de venda de todas as plataformas (Hotmart, CRM) em formato padronizado |
| `funnel_metrics_daily` | Métricas agregadas por funil e dia, incluindo investimento, receita, vendas e taxas calculadas |
| `funnel_summary` | Resumo agregado de cada funil com totais e status de saúde calculado |

### 1.2 Tabelas

| Tabela | Descrição |
|--------|-----------|
| `funnel_thresholds` | Configuração de thresholds para classificação de status do funil (excellent, good, attention, danger, etc.) |
| `metric_definitions` | Dicionário de métricas com definições, fórmulas e unidades para documentação e IA |

---

## 2. Dicionário de Dados

### 2.1 canonical_sale_events

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `internal_id` | TEXT | ID interno do registro (UUID convertido para texto) |
| `platform` | TEXT | Plataforma de origem: 'hotmart', 'stripe', etc. |
| `external_id` | TEXT | ID da transação na plataforma original |
| `project_id` | UUID | ID do projeto |
| `contact_email` | TEXT | Email do comprador |
| `contact_name` | TEXT | Nome do comprador |
| `contact_phone` | TEXT | Telefone do comprador |
| `event_type` | TEXT | Tipo de evento: 'sale', 'refund', 'chargeback', 'cancellation', 'expiration', 'pending' |
| `canonical_status` | TEXT | Status canônico: 'confirmed', 'reversed', 'expired', 'pending' |
| `sale_type` | TEXT | Tipo de venda: 'primary_sale', 'order_bump', 'upsell', 'downsell', NULL |
| `gross_value_brl` | NUMERIC | Valor bruto em BRL |
| `net_value_brl` | NUMERIC | Valor líquido em BRL |
| `currency` | TEXT | Moeda (sempre 'BRL') |
| `product_code` | TEXT | Código do produto |
| `product_name` | TEXT | Nome do produto |
| `offer_code` | TEXT | Código da oferta |
| `offer_name` | TEXT | Nome da oferta |
| `funnel_id` | TEXT | ID do funil (UUID convertido para texto) |
| `funnel_position` | TEXT | Posição no funil: 'front', 'order_bump', 'upsell', 'downsell' |
| `funnel_position_order` | INTEGER | Ordem da posição no funil |
| `event_timestamp` | TIMESTAMP | Data/hora do evento (UTC) |
| `purchase_date` | TIMESTAMP | Data da compra |
| `confirmation_date` | TIMESTAMP | Data de confirmação |
| `recorded_at` | TIMESTAMP | Data de registro no sistema |
| `utm_source` | TEXT | UTM Source |
| `utm_medium` | TEXT | UTM Medium |
| `utm_campaign` | TEXT | UTM Campaign |
| `utm_content` | TEXT | UTM Content |
| `utm_term` | TEXT | UTM Term |
| `checkout_origin` | TEXT | Origem do checkout (src) |
| `payment_method` | TEXT | Método de pagamento |
| `payment_type` | TEXT | Tipo de pagamento |
| `installments_number` | INTEGER | Número de parcelas |
| `original_status` | TEXT | Status original da plataforma |
| `is_subscription` | BOOLEAN | Se é assinatura |
| `affiliate_name` | TEXT | Nome do afiliado |
| `affiliate_id` | TEXT | Código do afiliado |

### 2.2 funnel_metrics_daily

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `project_id` | UUID | ID do projeto |
| `funnel_id` | TEXT | ID do funil |
| `metric_date` | DATE | Data da métrica |
| `investment` | NUMERIC | Investimento em Meta Ads |
| `confirmed_sales` | BIGINT | Vendas confirmadas |
| `front_sales` | BIGINT | Vendas front |
| `refunds` | BIGINT | Quantidade de reembolsos |
| `chargebacks` | BIGINT | Quantidade de chargebacks |
| `unique_buyers` | BIGINT | Compradores únicos |
| `gross_revenue` | NUMERIC | Receita bruta |
| `net_revenue` | NUMERIC | Receita líquida |
| `avg_ticket` | NUMERIC | Ticket médio |
| `roas` | NUMERIC | ROAS calculado |
| `cpa_real` | NUMERIC | CPA real |
| `refund_rate` | NUMERIC | Taxa de reembolso (%) |
| `chargeback_rate` | NUMERIC | Taxa de chargeback (%) |

### 2.3 funnel_summary

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `project_id` | UUID | ID do projeto |
| `funnel_id` | TEXT | ID do funil |
| `funnel_name` | TEXT | Nome do funil |
| `funnel_type` | TEXT | Tipo do funil |
| `roas_target` | NUMERIC | ROAS target configurado |
| `first_sale_date` | DATE | Data da primeira venda |
| `last_sale_date` | DATE | Data da última venda |
| `total_investment` | NUMERIC | Investimento total |
| `total_gross_revenue` | NUMERIC | Receita bruta total |
| `total_confirmed_sales` | BIGINT | Total de vendas confirmadas |
| `total_front_sales` | BIGINT | Total de vendas front |
| `total_refunds` | BIGINT | Total de reembolsos |
| `total_chargebacks` | BIGINT | Total de chargebacks |
| `overall_roas` | NUMERIC | ROAS geral |
| `overall_cpa` | NUMERIC | CPA geral |
| `overall_avg_ticket` | NUMERIC | Ticket médio geral |
| `overall_refund_rate` | NUMERIC | Taxa de reembolso geral (%) |
| `overall_chargeback_rate` | NUMERIC | Taxa de chargeback geral (%) |
| `health_status` | TEXT | Status de saúde: 'excellent', 'good', 'attention', 'danger', 'no-return', 'inactive' |

### 2.4 funnel_thresholds

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID do threshold |
| `project_id` | UUID | ID do projeto (NULL = global) |
| `threshold_key` | TEXT | Chave única do threshold |
| `threshold_value` | NUMERIC | Valor do threshold |
| `description` | TEXT | Descrição do threshold |
| `category` | TEXT | Categoria: 'roas', 'chargeback', 'refund', 'abandonment', 'activity' |

**Valores Padrão (Globais):**

| Threshold | Valor | Descrição |
|-----------|-------|-----------|
| `roas_excellent_multiplier` | 1.5 | ROAS >= target * 1.5 = Excelente |
| `roas_good_multiplier` | 1.0 | ROAS >= target * 1.0 = Bom |
| `roas_attention_multiplier` | 0.7 | ROAS >= target * 0.7 = Atenção |
| `roas_danger_multiplier` | 0.5 | ROAS >= target * 0.5 = Perigo |
| `chargeback_warning_percent` | 1.0 | Taxa chargeback >= 1% = Atenção |
| `chargeback_critical_percent` | 2.0 | Taxa chargeback >= 2% = Crítico |
| `refund_warning_percent` | 5.0 | Taxa reembolso >= 5% = Atenção |
| `refund_critical_percent` | 10.0 | Taxa reembolso >= 10% = Crítico |
| `inactive_days_threshold` | 30 | Dias sem vendas = Inativo |

---

## 3. Fórmulas das Métricas

| Métrica | Fórmula |
|---------|---------|
| **Investimento** | `SUM(meta_insights.spend)` |
| **Receita Bruta** | `SUM(gross_value_brl) WHERE event_type = 'sale' AND canonical_status = 'confirmed'` |
| **Receita Líquida** | `SUM(net_value_brl) WHERE event_type = 'sale' AND canonical_status = 'confirmed'` |
| **Vendas Confirmadas** | `COUNT(*) WHERE event_type = 'sale' AND canonical_status = 'confirmed'` |
| **Vendas Front** | `COUNT(*) WHERE event_type = 'sale' AND canonical_status = 'confirmed' AND funnel_position = 'front'` |
| **Ticket Médio** | `gross_revenue / confirmed_sales` |
| **ROAS** | `gross_revenue / investment` |
| **CPA Real** | `investment / front_sales` |
| **Taxa de Reembolso** | `(refunds / confirmed_sales) * 100` |
| **Taxa de Chargeback** | `(chargebacks / confirmed_sales) * 100` |
| **Compradores Únicos** | `COUNT(DISTINCT contact_email) WHERE confirmed` |

---

## 4. Mapeamento de Status

### 4.1 event_type (Tipo de Evento)

| Status Original | event_type Canônico |
|-----------------|---------------------|
| APPROVED, COMPLETE, COMPLETED, approved, complete, completed | `sale` |
| REFUNDED, refunded | `refund` |
| CHARGEBACK, CHARGEDBACK, chargeback | `chargeback` |
| CANCELLED, CANCELED, cancelled, canceled | `cancellation` |
| EXPIRED, expired | `expiration` |
| *outros* | `pending` |

### 4.2 canonical_status (Status Canônico)

| event_type | canonical_status |
|------------|------------------|
| sale | `confirmed` |
| refund, chargeback, cancellation | `reversed` |
| expiration | `expired` |
| *outros* | `pending` |

### 4.3 sale_type (Tipo de Venda)

| Posição no Funil | sale_type |
|------------------|-----------|
| front | `primary_sale` |
| order_bump | `order_bump` |
| upsell | `upsell` |
| downsell | `downsell` |
| *sem mapeamento* | `NULL` |

### 4.4 health_status (Status de Saúde)

| Condição | health_status |
|----------|---------------|
| Última venda > 30 dias atrás | `inactive` |
| Taxa de chargeback >= 2% | `no-return` |
| ROAS >= target * 1.5 | `excellent` |
| ROAS >= target * 1.0 | `good` |
| ROAS >= target * 0.7 | `attention` |
| ROAS < target * 0.7 | `danger` |

---

## 5. Checklist de Impacto

### ✅ O que foi criado
- [x] View `canonical_sale_events` - Unifica vendas de todas as plataformas
- [x] View `funnel_metrics_daily` - Métricas diárias por funil
- [x] View `funnel_summary` - Resumo agregado do funil
- [x] Tabela `funnel_thresholds` - Thresholds configuráveis
- [x] Tabela `metric_definitions` - Dicionário de métricas
- [x] Índices de performance para queries frequentes

### ✅ O que NÃO foi alterado
- [x] Tabela `hotmart_sales` - Mantida intacta
- [x] Tabela `crm_transactions` - Mantida intacta
- [x] Tabela `offer_mappings` - Mantida intacta
- [x] Frontend existente - Nenhuma alteração
- [x] Lógica de cálculo existente no frontend - Mantida

### ✅ Compatibilidade
- [x] Views usam SECURITY INVOKER (respeitam RLS das tabelas base)
- [x] Tabelas novas têm RLS habilitada
- [x] Dados existentes são lidos sem modificação
- [x] Não há breaking changes

---

## 6. Próximos Passos

### 6.1 Para Ativar IA Descritiva
1. Criar endpoint de consulta às views canônicas
2. Implementar prompts de análise usando `metric_definitions`
3. Configurar thresholds por projeto via `funnel_thresholds`
4. Criar tabela de insights gerados pela IA

### 6.2 Para Migrar Frontend
1. Criar hooks que consomem as views diretamente
2. Migrar cálculos hardcoded para usar métricas pré-calculadas
3. Substituir lógica de status por `health_status` da view
4. Permitir customização de thresholds por projeto

### 6.3 Para Integrar Novas Plataformas
1. Adicionar nova fonte de dados na CTE da view `canonical_sale_events`
2. Mapear status da nova plataforma para os enums canônicos
3. Testar deduplicação entre plataformas
4. Validar métricas calculadas

---

## 7. Diagrama da Camada Analítica

```
┌─────────────────────────────────────────────────────────────────┐
│                    FONTES DE DADOS                               │
├─────────────────────────────────────────────────────────────────┤
│  hotmart_sales  │  crm_transactions  │  meta_insights          │
└────────┬────────┴─────────┬──────────┴──────────┬───────────────┘
         │                   │                      │
         ▼                   ▼                      │
┌─────────────────────────────────────────────┐    │
│         canonical_sale_events               │    │
│    (View canônica de eventos de venda)      │    │
│    - Normaliza status                        │    │
│    - Unifica plataformas                     │    │
│    - Remove duplicatas                       │    │
└────────────────────┬────────────────────────┘    │
                     │                              │
                     ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    funnel_metrics_daily                         │
│              (Métricas agregadas por dia)                       │
│    - Agrega vendas da view canônica                             │
│    - Junta investimento do Meta Ads                             │
│    - Calcula ROAS, CPA, taxas                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      funnel_summary                             │
│              (Resumo agregado por funil)                        │
│    - Totais do período                                          │
│    - Métricas consolidadas                                      │
│    - Status de saúde calculado                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    TABELAS DE CONFIGURAÇÃO                      │
├─────────────────────────────────────────────────────────────────┤
│  funnel_thresholds    │    metric_definitions                   │
│  (Thresholds de       │    (Dicionário de                       │
│   classificação)      │     métricas)                           │
└───────────────────────┴─────────────────────────────────────────┘
```

---

*Documentação gerada em: 2026-01-04*
*Versão: 1.0*
