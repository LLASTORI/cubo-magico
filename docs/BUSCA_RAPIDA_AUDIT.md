# Auditoria Forense - Busca Rápida

**Data:** 2026-01-16
**Status:** 🔴 BUG CRÍTICO IDENTIFICADO

---

## 1. Fluxo de Dados Completo

```
BuscaRapida.tsx
      ↓
useFinanceLedger.ts (hook)
      ↓
finance_ledger_summary (VIEW)
      ↓
finance_ledger (TABELA) + hotmart_sales (JOIN para metadados)
```

---

## 2. Inventário de Métricas da UI

| Campo na UI | Arquivo React | Hook | View | Coluna SQL | Tipo | Fonte |
|-------------|---------------|------|------|------------|------|-------|
| Receita Líquida do Produtor | BuscaRapida.tsx:288-290 | useFinanceLedger.ts | finance_ledger_summary | net_revenue | 🔴 **ERRADO** | finance_ledger |
| Receita Bruta do Produtor | BuscaRapida.tsx:292-295 | useFinanceLedger.ts | finance_ledger_summary | producer_gross | 🔴 **ERRADO** | finance_ledger |
| Transações | BuscaRapida.tsx:297-300 | useFinanceLedger.ts | finance_ledger_summary | COUNT(*) | ⚠️ | finance_ledger |
| Taxas Hotmart | BuscaRapida.tsx:302-305 | useFinanceLedger.ts | finance_ledger_summary | platform_cost | ✅ OK | finance_ledger |
| Custo Coprodução | BuscaRapida.tsx:308-311 | useFinanceLedger.ts | finance_ledger_summary | coproducer_cost | ✅ OK | finance_ledger |
| Clientes Únicos | BuscaRapida.tsx:316-319 | useFinanceLedger.ts | finance_ledger_summary | buyer_email | ✅ OK | finance_ledger |

---

## 3. 🔴 BUG CRÍTICO IDENTIFICADO

### A View `finance_ledger_summary` está INVERTENDO os conceitos!

**Definição SQL atual da view:**

```sql
producer_gross = SUM(CASE WHEN event_type IN ('credit', 'producer') THEN amount ELSE 0 END)
net_revenue = producer_gross - SUM(abs(affiliate + coproducer + platform_fee + tax + refund + chargeback))
```

**O problema:**
- `producer_gross` está somando os **eventos de CREDIT** (que é o valor que o produtor recebe APÓS taxas)
- O nome da coluna diz "gross" mas o valor é **NET**

### Dados reais da tabela `finance_ledger`:

| transaction_id | event_type | amount |
|----------------|------------|--------|
| HP3609747213C1 | credit | 44.89 |
| HP3609747213C1 | platform_fee | 7.21 |
| HP3609747213C2 | credit | 17.75 |
| HP3609747213C2 | platform_fee | 3.50 |
| HP3609747213C3 | credit | 31.79 |
| HP3609747213C3 | platform_fee | 5.42 |

**Soma de CREDIT:** 44.89 + 17.75 + 31.79 = **94.43** (isso é o producer_net do Orders Core!)
**Soma de PLATFORM_FEE:** 7.21 + 3.50 + 5.42 = **16.13**

**Mas na view:**
- `producer_gross` = 94.43 (ERRADO - deveria ser 205)
- `net_revenue` = 78.30 (ERRADO - deveria ser 94.43)

---

## 4. Prova com Juliane Coeli (HP3609747213C1)

### Dados corretos (Orders Core):

| Métrica | Valor | Fonte |
|---------|-------|-------|
| customer_paid | R$ 205,00 | orders.customer_paid |
| producer_net | R$ 94,43 | orders.producer_net |
| Itens | 3 (97 + 39 + 69) | order_items.base_price |

### Dados exibidos na finance_ledger_summary:

| Métrica | Valor | Fonte |
|---------|-------|-------|
| producer_gross | R$ 94,43 | 🔴 ERRADO - está mostrando o NET como GROSS |
| net_revenue | R$ 78,30 | 🔴 ERRADO - subtraiu taxas de novo |
| platform_cost | R$ 16,13 | ✅ OK |

### Comparação:

| UI Label | SQL Column | Valor Exibido | Valor Real | Correto? |
|----------|------------|---------------|------------|----------|
| Valor Bruto | producer_gross | R$ 94,43 | R$ 205,00 | 🔴 **NÃO** |
| Valor Líquido | net_revenue | R$ 78,30 | R$ 94,43 | 🔴 **NÃO** |
| Taxas | platform_cost | R$ 16,13 | R$ 16,13 | ✅ SIM |

---

## 5. Explicação Técnica do Bug

### O que acontece:

1. **Hotmart envia via webhook:** `credit = 44.89` (valor JÁ LÍQUIDO para o produtor)
2. A view `finance_ledger_summary` soma os `credit` e chama de `producer_gross`
3. Depois SUBTRAI as taxas de novo: `net_revenue = producer_gross - platform_cost`
4. Resultado: **dupla dedução de taxas**

### Por que "Líquido > Bruto" pode aparecer:

Se houver linhas com:
- `credit` = 100 (chamado de "gross")
- `net_revenue` = 100 - 0 (sem taxas no registro)

E outras com:
- `credit` = 50 (chamado de "gross")
- `platform_fee` = 10

A agregação pode inverter em alguns casos dependendo dos dados.

---

## 6. Diagnóstico Final

| Critério | Status |
|----------|--------|
| Usa Orders Core? | 🔴 **NÃO** - usa finance_ledger |
| Usa Ledger corretamente? | 🔴 **NÃO** - interpreta `credit` como GROSS |
| Usa valores de venda ou eventos financeiros? | 🔴 **EVENTOS** - deveria usar orders.customer_paid |
| Pode ser usado para decisão? | ❌ **NÃO** |

---

## 7. Localização do Erro

| Componente | Arquivo | Problema |
|------------|---------|----------|
| View SQL | `finance_ledger_summary` | `producer_gross` soma `credit` events, que são NET |
| Hook | `src/hooks/useFinanceLedger.ts` | Usa a view com conceitos errados |
| UI | `src/pages/BuscaRapida.tsx` | Exibe `producer_gross` como "Receita Bruta" |

### SQL da View (PROBLEMA):

```sql
sum(CASE WHEN fl.event_type IN ('credit', 'producer') THEN fl.amount ELSE 0 END) AS producer_gross
```

**Correção necessária:**
- `producer_gross` deveria vir de `orders.customer_paid` (ou uma tabela equivalente)
- O `credit` do finance_ledger é o valor JÁ LÍQUIDO

---

## 8. Recomendação

**NÃO CORRIGIR AINDA** - apenas documentar.

A correção deveria:
1. Usar `orders.customer_paid` como valor bruto
2. Usar `orders.producer_net` ou `SUM(credit)` como valor líquido
3. NÃO fazer dupla dedução

**Fluxo correto:**
```
customer_paid (205) → deduz taxas → producer_net (94.43)
```

**Fluxo atual (errado):**
```
credit (94.43) → deduz taxas DE NOVO → net_revenue (78.30)
```

---

## 9. Impacto

- **Receita Bruta:** Subnotificada em ~54% (205 vs 94.43)
- **Receita Líquida:** Subnotificada em ~17% (94.43 vs 78.30)
- **ROAS:** Potencialmente incorreto
- **Decisões de negócio:** Comprometidas

---

## 10. Arquivos para Correção (quando aprovado)

1. `finance_ledger_summary` (VIEW SQL) - precisa migrar para Orders Core
2. `src/hooks/useFinanceLedger.ts` - precisa usar fontes corretas
3. `src/pages/BuscaRapida.tsx` - pode manter, desde que hook seja corrigido
