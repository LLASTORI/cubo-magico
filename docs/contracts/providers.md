# Contrato: Providers

**Versão:** 1.0  
**Data:** 2026-01-29  
**Status:** ✅ Ativo  
**Domínio:** Integrações Externas

---

## 1. DEFINIÇÃO

**Providers** são plataformas externas de venda que enviam dados para o Cubo Mágico.

O sistema é projetado para ser **multi-provider**.

---

## 2. PROVIDERS SUPORTADOS

| Provider | Status | Webhook | API | CSV |
|----------|--------|---------|-----|-----|
| Hotmart | ✅ Ativo | ✅ | ✅ | ✅ |
| Eduzz | 🔜 Futuro | - | - | - |
| Kiwify | 🔜 Futuro | - | - | - |
| Monetizze | 🔜 Futuro | - | - | - |
| Stripe | 🔜 Futuro | - | - | - |

---

## 3. ARQUITETURA MULTI-PROVIDER

### 3.1 Princípio

O sistema assume que:
- Códigos de oferta **NÃO** são globalmente únicos
- Códigos de transação **NÃO** são globalmente únicos
- A identidade real requer o **provider** como prefixo

### 3.2 Chaves de Identidade

| Entidade | Chave Única |
|----------|-------------|
| Oferta | `(project_id, provider, codigo_oferta)` |
| Pedido | `(project_id, provider, provider_order_id)` |
| Transação | `(project_id, provider, provider_transaction_id)` |

---

## 4. TABELA DE CREDENCIAIS

### `provider_credentials`

```sql
CREATE TABLE provider_credentials (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  provider TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  credential_value TEXT NOT NULL, -- encrypted
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, provider, credential_type)
);
```

---

## 5. TIPOS DE CREDENCIAIS

### Hotmart

| Tipo | Descrição |
|------|-----------|
| `hottok` | Token de autenticação webhook |
| `client_id` | OAuth Client ID |
| `client_secret` | OAuth Client Secret |
| `access_token` | Token de acesso API |
| `refresh_token` | Token de refresh |

---

## 6. CAMPOS PROVIDER EM TABELAS

### 6.1 Tabelas com Campo Provider

| Tabela | Campo | Propósito |
|--------|-------|-----------|
| `offer_mappings` | `provider` | Identificar origem da oferta |
| `orders` | `provider` | Identificar origem do pedido |
| `order_items` | (via order) | Herda do pedido pai |
| `provider_event_log` | `provider` | Identificar origem do evento |
| `ledger_events` | (via order) | Herda do pedido pai |

### 6.2 Valor Padrão

```sql
provider TEXT NOT NULL DEFAULT 'hotmart'
```

---

## 7. FLUXO DE INTEGRAÇÃO

### 7.1 Webhook

```
Provider → Edge Function específica → Orders Core → Ledger
          (hotmart-webhook)
          (eduzz-webhook) [futuro]
          (kiwify-webhook) [futuro]
```

### 7.2 API Sync

```
Provider API → Edge Function específica → Offer Mappings / Enriquecimento
               (hotmart-products)
               (eduzz-products) [futuro]
```

### 7.3 CSV Import

```
CSV → Edge Function genérica → Orders Core (replay)
      (orders-full-backfill)
```

---

## 8. NORMALIZAÇÃO DE DADOS

### 8.1 Status de Pedido

Cada provider tem seus próprios status. O sistema normaliza para:

| Status Interno | Descrição |
|----------------|-----------|
| `pending` | Aguardando pagamento |
| `approved` | Pagamento aprovado |
| `complete` | Pedido completo |
| `canceled` | Cancelado |
| `refunded` | Reembolsado |
| `chargeback` | Contestação |
| `dispute` | Em disputa |

### 8.2 Mapeamento Hotmart

| Hotmart Event | Status Interno |
|---------------|----------------|
| `PURCHASE_COMPLETE` | `complete` |
| `PURCHASE_APPROVED` | `approved` |
| `PURCHASE_CANCELED` | `canceled` |
| `PURCHASE_REFUNDED` | `refunded` |
| `PURCHASE_CHARGEBACK` | `chargeback` |
| `PURCHASE_PROTEST` | `dispute` |
| `PURCHASE_DELAYED` | `pending` |
| `PURCHASE_BILLET_PRINTED` | `pending` |

---

## 9. ISOLAMENTO DE PROVIDERS

### 9.1 Regra

Dados de um provider **NUNCA** devem interferir em dados de outro provider.

### 9.2 Queries

Sempre filtrar por provider:

```sql
-- ✅ Correto
SELECT * FROM orders
WHERE project_id = $1
AND provider = 'hotmart';

-- ❌ Incorreto (pode misturar providers)
SELECT * FROM orders
WHERE project_id = $1;
```

---

## 10. ADIÇÃO DE NOVO PROVIDER

### Checklist

| Passo | Descrição |
|-------|-----------|
| 1 | Criar edge function de webhook |
| 2 | Criar edge function de API sync |
| 3 | Adicionar mapeamento de status |
| 4 | Criar adaptador de CSV (se aplicável) |
| 5 | Atualizar UI de configuração |
| 6 | Documentar mapeamentos |
| 7 | Testar idempotência |
| 8 | Validar integridade de ledger |

### Template de Webhook

```typescript
// supabase/functions/{provider}-webhook/index.ts

import { createClient } from '@supabase/supabase-js';

const PROVIDER = '{provider}';

Deno.serve(async (req) => {
  // 1. Validar autenticidade
  // 2. Salvar em provider_event_log
  // 3. Normalizar dados
  // 4. Processar via Orders Core
  // 5. Criar ledger_events se aprovação
  // 6. Fallback offer_mappings se necessário
});
```

---

## 11. AÇÕES PROIBIDAS

| Ação | Consequência |
|------|--------------|
| ❌ Assumir código único global | Conflitos de dados |
| ❌ Misturar dados de providers | Corrupção de relatórios |
| ❌ Ignorar campo provider em queries | Resultados incorretos |
| ❌ Criar tabelas específicas por provider | Fragmentação de arquitetura |

---

## 12. EDGE FUNCTIONS POR PROVIDER

### Hotmart (Ativo)

| Função | Propósito |
|--------|-----------|
| `hotmart-webhook` | Receber eventos em tempo real |
| `hotmart-products` | Sincronizar catálogo de ofertas |
| `hotmart-orders-backfill-14d` | Backfill de pedidos recentes |
| `hotmart-ledger-full-backfill` | Reconstruir ledger |

### Genéricos

| Função | Propósito |
|--------|-----------|
| `orders-full-backfill` | Importar CSV histórico |

---

## 13. INVARIANTES

| Invariante | Descrição |
|------------|-----------|
| Isolamento | Providers não interferem entre si |
| Normalização | Status sempre no formato interno |
| Identificação | Toda entidade tem provider explícito |
| Extensibilidade | Novo provider = nova edge function |

---

*Este documento é a fonte oficial de verdade para o domínio de Integrações Externas.*
