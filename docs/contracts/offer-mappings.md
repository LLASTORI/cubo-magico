# Contrato: Offer Mappings

**Versão:** 1.0  
**Data:** 2026-01-29  
**Status:** ✅ Ativo  
**Domínio:** Catálogo de Ofertas

---

## 1. CONTEXTO OBRIGATÓRIO (NÃO DISCUTIR)

O sistema Cubo Mágico possui:

- Ledger financeiro 100% funcional
- Webhook Hotmart como única fonte de verdade financeira
- API Hotmart de Produtos & Ofertas restaurada e funcionando
- CSV apenas para replay histórico

❗ **O LEDGER, ORDERS E WEBHOOK FINANCEIRO NÃO DEVEM SER ALTERADOS EM HIPÓTESE ALGUMA.**

Este contrato trata **APENAS** de `offer_mappings`.

---

## 2. OBJETIVO DO SISTEMA

O sistema de Offer Mappings é:

- **Proativo** (não depende só de ação manual)
- **Preparado para múltiplos providers**
- **Sem QUALQUER impacto financeiro**
- **Sem alterar ledger, orders ou cálculo de vendas**

---

## 3. ESTRUTURA — PROVIDER

### 3.1 Campo Obrigatório

```sql
provider TEXT NOT NULL DEFAULT 'hotmart'
```

### 3.2 Valor Atual

Em 100% dos casos atuais:
```
provider = 'hotmart'
```

### 3.3 Regra de Identidade

O sistema assume que:

- `codigo_oferta` **NÃO** é globalmente único
- A identidade real da oferta é a chave composta:

```
(project_id, provider, codigo_oferta)
```

---

## 4. REGRA DE OURO (ABSOLUTA)

### 🚫 `offer_mappings` NÃO É FINANCEIRO

Portanto:

| ❌ Proibido | Motivo |
|-------------|--------|
| Recalcular valores | Não é fonte financeira |
| Alterar ledger | Domínio separado |
| Alterar orders | Domínio separado |
| Substituir dados do webhook | Webhook é fonte de verdade |

**`offer_mappings` é catálogo semântico + mapeamento para funis.**

---

## 5. COMPORTAMENTO — FALLBACK VIA WEBHOOK (SEM FINANCEIRO)

### 5.1 Situação

Quando uma venda chega via webhook Hotmart contendo um `provider_offer_id` que:

- NÃO existe em `offer_mappings`
- PARA o mesmo `project_id`
- E `provider = 'hotmart'`

### 5.2 Ação PERMITIDA (OBRIGATÓRIA)

Criar **automaticamente** um registro mínimo em `offer_mappings`.

### 5.3 Dados Mínimos a Criar

```json
{
  "project_id": "<project_id>",
  "provider": "hotmart",
  "codigo_oferta": "<provider_offer_id>",
  "id_produto": "<product_ucode ?? null>",
  "nome_produto": "<product_name ?? null>",
  "nome_oferta": "<offer_name ?? 'Oferta (via venda)'>",
  "valor": null,
  "valor_original": null,
  "moeda": "BRL",
  "status": "active",
  "funnel_id": null,
  "id_funil": "A Definir",
  "origem": "sale_fallback"
}
```

❗ **Nunca inferir, recalcular ou confiar nesses valores como financeiros.**

---

## 6. AÇÕES PROIBIDAS

| Ação | Consequência |
|------|--------------|
| ❌ Criar ou alterar ledger | ERRO GRAVE |
| ❌ Criar ou alterar orders | ERRO GRAVE |
| ❌ Recalcular valores financeiros | ERRO GRAVE |
| ❌ Substituir dados do webhook | ERRO GRAVE |
| ❌ Criar dependência entre offer_mappings e financeiro | ERRO GRAVE |

---

## 7. SINCRONIZAÇÃO `id_funil` ↔ `funnel_id`

Correção segura permitida:

```sql
UPDATE offer_mappings om
SET id_funil = f.name
FROM funnels f
WHERE om.funnel_id = f.id
AND om.id_funil = 'A Definir';
```

📌 Esta correção:
- NÃO toca financeiro
- NÃO toca orders
- É apenas saneamento de dados de catálogo

---

## 8. ORIGENS DE DADOS

| `origem` | Descrição |
|----------|-----------|
| `manual` | Criado manualmente pelo usuário |
| `api_sync` | Sincronizado via API Hotmart Products |
| `sale_fallback` | Criado automaticamente ao receber venda com oferta desconhecida |

---

## 9. RESULTADO ESPERADO

Após a implementação deste contrato:

| Comportamento | Status |
|---------------|--------|
| Ofertas novas vindas de vendas aparecem automaticamente | ✅ |
| Usuário não precisa rodar import manual para enxergar ofertas | ✅ |
| Funis continuam funcionando normalmente | ✅ |
| Ledger permanece 100% intacto | ✅ |
| Sistema preparado para Hotmart (hoje) | ✅ |
| Sistema preparado para Eduzz/outros (futuro) | ✅ |

---

## 10. REGRAS FINAIS

| Regra | Descrição |
|-------|-----------|
| ❗ NÃO FAZER SUPOSIÇÕES | Seguir exatamente o contrato |
| ❗ NÃO SIMPLIFICAR | Manter todas as regras |
| ❗ NÃO "MELHORAR" O FINANCEIRO | Financeiro é domínio separado |
| ❗ NÃO ALTERAR WEBHOOK DE VENDAS | Webhook é fonte de verdade |

Se algo falhar:
1. Gerar relatório técnico
2. NÃO corrigir automaticamente
3. Escalar para revisão

---

## 11. IMPLEMENTAÇÃO DE REFERÊNCIA

### Edge Functions Afetadas

- `hotmart-webhook/index.ts` — Fallback automático
- `hotmart-orders-backfill-14d/index.ts` — Fallback automático
- `orders-full-backfill/index.ts` — Fallback automático
- `hotmart-products/index.ts` — Sync via API

### Constraint de Unicidade

```sql
UNIQUE (project_id, provider, codigo_oferta)
```

### Índice de Performance

```sql
CREATE INDEX idx_offer_mappings_provider_lookup 
ON offer_mappings(project_id, provider, codigo_oferta);
```

---

*Este documento é a fonte oficial de verdade para o domínio de Offer Mappings.*
