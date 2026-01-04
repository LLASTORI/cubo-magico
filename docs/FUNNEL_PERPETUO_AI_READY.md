# Funil Perpétuo - Preparação para IA Descritiva

> **Data:** 2026-01-04  
> **Status:** ✅ Pronto para leitura por IA (camada analítica disponível)  
> **Versão:** 1.0

---

## PASSO 1 — MAPEAMENTO COMPLETO DO SISTEMA ATUAL

### 1.1 Tabelas Base (Fonte dos Dados)

| Tabela | Descrição | Uso |
|--------|-----------|-----|
| `funnels` | Cadastro de funis (perpetuo, lancamento, indefinido) | Configuração de ROAS target, padrão de campanha |
| `offer_mappings` | Mapeamento de ofertas para funis | Liga código de oferta → funil, posição (FRONT, OB, US, DS) |
| `hotmart_sales` | Transações de vendas da Hotmart | Vendas aprovadas, abandonadas, reembolsadas, chargebacks |
| `meta_insights` | Insights de anúncios Meta (nível de ad) | Investimento, impressões, cliques, ações |
| `meta_campaigns` | Campanhas Meta Ads | Nome da campanha para matching com padrão do funil |
| `funnel_meta_accounts` | Vínculo funil → contas Meta | Define quais contas geram investimento para cada funil |
| `funnel_thresholds` | Limites de classificação | Define thresholds para ROAS, refund, chargeback |
| `metric_definitions` | Dicionário de métricas | Significado oficial de cada métrica |

### 1.2 Views Analíticas (Camada Canônica)

| View | Descrição | Origem |
|------|-----------|--------|
| `canonical_sale_events` | Eventos de venda normalizados | `hotmart_sales` + `offer_mappings` |
| `funnel_metrics_daily` | Métricas diárias por funil | `canonical_sale_events` + `meta_insights` |
| `funnel_summary` | Resumo consolidado por funil | `funnel_metrics_daily` + `funnels` |

### 1.3 Onde Cada Métrica é Calculada

#### Métricas Calculadas no BACKEND (Views SQL)

| Métrica | View/Tabela | Fórmula |
|---------|-------------|---------|
| `investment` | `funnel_metrics_daily` | `SUM(meta_insights.spend)` por campanha matching |
| `gross_revenue` | `funnel_metrics_daily` | `SUM(gross_value_brl)` eventos confirmados |
| `net_revenue` | `funnel_metrics_daily` | `SUM(net_value_brl)` eventos confirmados |
| `confirmed_sales` | `funnel_metrics_daily` | `COUNT(*)` eventos com `canonical_status = 'confirmed'` |
| `front_sales` | `funnel_metrics_daily` | `COUNT(*)` eventos com `sale_type = 'front'` |
| `refunds` | `funnel_metrics_daily` | `COUNT(*)` eventos com `event_type = 'refunded'` |
| `chargebacks` | `funnel_metrics_daily` | `COUNT(*)` eventos com `event_type = 'chargeback'` |
| `unique_buyers` | `funnel_metrics_daily` | `COUNT(DISTINCT contact_email)` |
| `avg_ticket` | `funnel_metrics_daily` | `gross_revenue / confirmed_sales` |
| `roas` | `funnel_metrics_daily` | `gross_revenue / investment` |
| `cpa_real` | `funnel_metrics_daily` | `investment / front_sales` |
| `refund_rate` | `funnel_metrics_daily` | `(refunds / confirmed_sales) * 100` |
| `chargeback_rate` | `funnel_metrics_daily` | `(chargebacks / confirmed_sales) * 100` |
| `health_status` | `funnel_summary` | Calculado via thresholds (ver seção 2.3) |

#### Métricas Calculadas no FRONTEND (Hooks React)

| Hook | Arquivo | Métricas Calculadas |
|------|---------|---------------------|
| `useFunnelData` | `src/hooks/useFunnelData.ts` | `summaryMetrics` (totalVendas, totalReceita, ticketMedio, ROAS, CPA) |
| `useFunnelHealthMetrics` | `src/hooks/useFunnelHealthMetrics.ts` | Abandonos, recuperação, reembolsos por funil |
| `CuboMagicoDashboard` | `src/components/funnel/CuboMagicoDashboard.tsx` | Status do funil (excellent, good, attention, danger) |

### 1.4 Onde Cada Métrica é Exibida na UI

| Componente | Arquivo | Métricas Exibidas |
|------------|---------|-------------------|
| `FunnelAnalysis` | `src/pages/FunnelAnalysis.tsx` | Dashboard principal: vendas, receita, ROAS, CPA, investimento |
| `CuboMagicoDashboard` | `src/components/funnel/CuboMagicoDashboard.tsx` | Cards por funil: status, ROAS, CPA, vendas front, ticket médio |
| `FunnelHealthMetrics` | `src/components/funnel/FunnelHealthMetrics.tsx` | Métricas de saúde: abandonos, reembolsos, chargebacks |
| `PeriodComparison` | `src/components/funnel/PeriodComparison.tsx` | Comparação entre períodos |
| `TemporalChart` | `src/components/funnel/TemporalChart.tsx` | Evolução temporal das métricas |

---

## PASSO 2 — MODELO CANÔNICO DE ANÁLISE

### 2.1 Entidades Conceituais

#### **Funnel** (Funil)
- **Mapeamento:** Tabela `funnels`
- **Atributos principais:** `id`, `name`, `funnel_type`, `roas_target`, `campaign_name_pattern`
- **Tipos:** `perpetuo`, `lancamento`, `indefinido`

#### **FunnelPeriod** (Período de Análise)
- **Mapeamento:** NÃO É TABELA - é um filtro aplicado nas queries
- **Atributos:** `start_date`, `end_date`
- **Aplicação:** Usado como parâmetro em `useFunnelData` e `funnel_metrics_daily`

#### **FunnelMetricsSnapshot** (Foto das Métricas)
- **Mapeamento:** View `funnel_metrics_daily` (uma linha por dia/funil)
- **Atributos:** Todas as métricas diárias calculadas
- **Uso:** Agregação para resumos e análise temporal

#### **CanonicalSaleEvent** (Evento de Venda Canônico)
- **Mapeamento:** View `canonical_sale_events`
- **Atributos:** 37 campos normalizados (ver seção 1.2)
- **Propósito:** Unificar eventos de diferentes plataformas (hoje apenas Hotmart)

### 2.2 Mapeamento Entidades → Estruturas Existentes

```
┌──────────────────────┐     ┌─────────────────────┐
│     funnels          │     │   offer_mappings    │
│ (configuração)       │────▶│ (código → funil)    │
└──────────────────────┘     └─────────────────────┘
         │                            │
         │                            ▼
         │                   ┌─────────────────────┐
         │                   │   hotmart_sales     │
         │                   │ (eventos brutos)    │
         │                   └─────────────────────┘
         │                            │
         ▼                            ▼
┌──────────────────────┐     ┌─────────────────────┐
│  funnel_meta_accounts│     │canonical_sale_events│
│ (funil → contas Meta)│     │ (eventos normalizados)
└──────────────────────┘     └─────────────────────┘
         │                            │
         ▼                            ▼
┌──────────────────────┐     ┌─────────────────────┐
│   meta_insights      │────▶│ funnel_metrics_daily│
│ (investimento)       │     │ (métricas por dia)  │
└──────────────────────┘     └─────────────────────┘
                                      │
                                      ▼
                             ┌─────────────────────┐
                             │   funnel_summary    │
                             │ (resumo consolidado)│
                             └─────────────────────┘
```

### 2.3 Classificação de health_status

O `health_status` é calculado na view `funnel_summary` seguindo esta lógica:

| Status | Condição | Descrição |
|--------|----------|-----------|
| `inactive` | Sem vendas nos últimos 30 dias | Funil parado |
| `no-return` | `overall_roas IS NULL` (sem investimento) | Sem dados de retorno |
| `excellent` | `overall_roas >= roas_target * 1.5` | Performance excepcional |
| `good` | `overall_roas >= roas_target * 1.0` | Meta atingida |
| `attention` | `overall_roas >= roas_target * 0.5` | Abaixo da meta, precisa atenção |
| `danger` | `overall_roas < roas_target * 0.5` | Performance crítica |

Os multiplicadores são configuráveis em `funnel_thresholds`.

---

## PASSO 3 — CAMADA ANALÍTICA DISPONÍVEL

### 3.1 Views Prontas para Leitura por IA

#### `funnel_summary` — Resumo Consolidado
```sql
SELECT * FROM funnel_summary 
WHERE project_id = :project_id
  AND funnel_type = 'perpetuo';
```

**Campos disponíveis:**
- `funnel_id`, `funnel_name`, `funnel_type`
- `roas_target`
- `first_sale_date`, `last_sale_date`
- `total_investment`, `total_gross_revenue`
- `total_confirmed_sales`, `total_front_sales`
- `total_refunds`, `total_chargebacks`
- `overall_roas`, `overall_cpa`, `overall_avg_ticket`
- `overall_refund_rate`, `overall_chargeback_rate`
- `health_status`

#### `funnel_metrics_daily` — Métricas Diárias
```sql
SELECT * FROM funnel_metrics_daily 
WHERE project_id = :project_id
  AND funnel_id = :funnel_id
  AND metric_date BETWEEN :start_date AND :end_date
ORDER BY metric_date DESC;
```

**Campos disponíveis:**
- `funnel_id`, `metric_date`
- `investment`, `gross_revenue`, `net_revenue`
- `confirmed_sales`, `front_sales`, `refunds`, `chargebacks`, `unique_buyers`
- `avg_ticket`, `roas`, `cpa_real`
- `refund_rate`, `chargeback_rate`

#### `metric_definitions` — Dicionário de Métricas
```sql
SELECT * FROM metric_definitions ORDER BY display_order;
```

#### `funnel_thresholds` — Limites de Classificação
```sql
SELECT * FROM funnel_thresholds 
WHERE project_id IS NULL OR project_id = :project_id;
```

### 3.2 O Que NÃO Existe (e NÃO Deve Ser Inventado)

| Dado | Status | Observação |
|------|--------|------------|
| `total_front_sales` | ⚠️ Sempre 0 | Bug conhecido: posição FRONT não está sendo contada |
| `overall_cpa` | ⚠️ NULL frequente | Depende de `front_sales` que está zerado |
| Dados de outras plataformas | ❌ Não existe | Apenas Hotmart está integrada |
| Métricas de conversão Meta | ❌ Não na view | Calculadas apenas no frontend |

---

## PASSO 4 — NORMALIZAÇÃO SEMÂNTICA (DOCUMENTAÇÃO)

### 4.1 Definição de "Sale" (Venda)

Uma **venda** é registrada na `hotmart_sales` quando:
- Um checkout é iniciado (abandono) → `status = 'ABANDONED'`
- Um pagamento é confirmado → `status = 'APPROVED'` ou `'COMPLETE'`
- Um reembolso ocorre → `status = 'REFUNDED'`
- Um chargeback ocorre → `status = 'CHARGEBACK'`
- Um cancelamento ocorre → `status = 'CANCELLED'`

### 4.2 Definição de "Conversion" (Conversão)

**Conversão** é usada em dois contextos:

1. **Conversão de Vendas (Hotmart)**
   - Taxa de conversão = `vendas_posição / vendas_front * 100`
   - Calculada no frontend (`useFunnelData.ts`, linha 389)

2. **Conversão de Anúncios (Meta)**
   - `connect_rate` = `landing_page_view / link_click * 100`
   - `tx_pagina_checkout` = `initiate_checkout / landing_page_view * 100`
   - `tx_checkout_compra` = `purchase / initiate_checkout * 100`
   - Calculadas no frontend (`CuboMagicoDashboard.tsx`, linhas 412-415)

### 4.3 Mapeamento de Status

#### Status Original (hotmart_sales.status)

| Status Original | Tipo de Evento | Status Canônico | Descrição |
|-----------------|----------------|-----------------|-----------|
| `ABANDONED` | `abandoned` | `pending` | Checkout não completado |
| `APPROVED` | `sale` | `confirmed` | Pagamento confirmado |
| `COMPLETE` | `sale` | `confirmed` | Entrega concluída |
| `REFUNDED` | `refunded` | `cancelled` | Reembolso processado |
| `CHARGEBACK` | `chargeback` | `cancelled` | Disputa de cartão |
| `CANCELLED` | `cancelled` | `cancelled` | Cancelado pelo comprador |
| `PENDING` | `sale` | `pending` | Aguardando pagamento |
| `OVERDUE` | `sale` | `pending` | Boleto vencido |

#### Mapeamento de sale_type (Posição no Funil)

| tipo_posicao (offer_mappings) | sale_type (canônico) |
|-------------------------------|----------------------|
| `FRONT`, `FE` | `front` |
| `OB` | `order_bump` |
| `US` | `upsell` |
| `DS` | `downsell` |
| (não mapeado) | `other` |

### 4.4 Status do Funil (health_status)

| Status | Cor | Significado |
|--------|-----|-------------|
| `excellent` | 🟢 Verde | ROAS ≥ 150% da meta |
| `good` | 🔵 Azul | ROAS ≥ 100% da meta |
| `attention` | 🟡 Amarelo | ROAS entre 50-100% da meta |
| `danger` | 🔴 Vermelho | ROAS < 50% da meta |
| `no-return` | ⚪ Cinza | Sem investimento (ROAS não calculável) |
| `inactive` | ⬛ Preto | Sem vendas há 30+ dias |

---

## PASSO 5 — PREPARAÇÃO PARA IA (CONSUMO DE DADOS)

### 5.1 Dados que uma IA PODE Consumir

| Fonte | Tipo | Uso Permitido |
|-------|------|---------------|
| `funnel_summary` | View | ✅ Leitura completa |
| `funnel_metrics_daily` | View | ✅ Leitura completa |
| `metric_definitions` | Tabela | ✅ Para interpretar métricas |
| `funnel_thresholds` | Tabela | ✅ Para classificar desempenho |
| `canonical_sale_events` | View | ✅ Análise detalhada de eventos |

### 5.2 Dados que uma IA NÃO DEVE Consumir Diretamente

| Fonte | Motivo |
|-------|--------|
| `hotmart_sales` (tabela bruta) | Usar `canonical_sale_events` em vez disso |
| `meta_insights` (dados brutos) | Já agregados em `funnel_metrics_daily` |
| Dados de CPF/documento | Dados sensíveis (LGPD) |

### 5.3 Métricas Oficiais (Nunca Recalcular)

A IA **NUNCA** deve recalcular estas métricas — usar o valor já consolidado:

| Métrica | Fonte Oficial |
|---------|---------------|
| `investment` | `funnel_metrics_daily.investment` |
| `gross_revenue` | `funnel_metrics_daily.gross_revenue` |
| `roas` | `funnel_metrics_daily.roas` |
| `cpa_real` | `funnel_metrics_daily.cpa_real` |
| `health_status` | `funnel_summary.health_status` |
| `refund_rate` | `funnel_metrics_daily.refund_rate` |
| `chargeback_rate` | `funnel_metrics_daily.chargeback_rate` |

### 5.4 O Que a IA Pode Fazer

✅ **Permitido:**
- Interpretar e explicar o `health_status`
- Identificar tendências nos dados diários
- Comparar períodos usando `funnel_metrics_daily`
- Gerar resumos executivos baseados em `funnel_summary`
- Alertar sobre taxas de refund/chargeback acima dos thresholds

❌ **Proibido:**
- Recalcular métricas (usar valores das views)
- Inventar números não presentes nos dados
- Acessar dados de outras tabelas sem passar pela camada canônica
- Fazer recomendações prescritivas (não é escopo atual)

---

## PASSO 6 — VALIDAÇÃO FINAL

### 6.1 Checklist de Integridade

| Verificação | Status |
|-------------|--------|
| UI continua funcionando? | ✅ Nenhuma alteração no frontend |
| Métricas existentes alteradas? | ✅ Não - apenas documentação |
| Números foram modificados? | ✅ Não |
| Depende de IA para funcionar? | ✅ Não - IA é opcional |
| Views existentes alteradas? | ✅ Não |
| Tabelas existentes alteradas? | ✅ Não |

### 6.2 Limitações Conhecidas

1. **`total_front_sales` zerado**: A contagem de vendas front não está funcionando corretamente na view. O frontend recalcula via `useFunnelData`.

2. **`overall_cpa` NULL**: Como depende de `front_sales`, está frequentemente NULL.

3. **Apenas Hotmart**: A camada canônica suporta apenas dados da Hotmart. Outras plataformas não estão integradas.

4. **Métricas de conversão Meta**: Não estão nas views, apenas no frontend.

---

## Próximos Passos (Fora deste Escopo)

1. **Ativar IA Descritiva**: Edge function `funnel-ai-analysis` já existe
2. **Corrigir `front_sales`**: Investigar join entre `canonical_sale_events` e posição
3. **Adicionar métricas Meta**: Incluir `connect_rate`, `tx_pagina_checkout` nas views
4. **Integrar outras plataformas**: Kiwify, Eduzz, etc.

---

## Referências

- Camada Analítica: `docs/CAMADA_ANALITICA_CANONICA.md`
- Hook de dados: `src/hooks/useFunnelData.ts`
- Dashboard principal: `src/components/funnel/CuboMagicoDashboard.tsx`
- Edge function IA: `supabase/functions/funnel-ai-analysis/index.ts`
