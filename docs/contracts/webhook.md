# Contrato: Webhook

**Versão:** 1.0  
**Data:** 2026-01-29  
**Status:** ✅ Ativo  
**Domínio:** Ingestão de Eventos

---

## 1. DEFINIÇÃO

O **Webhook** é a porta de entrada para eventos de vendas em tempo real.

Ele é a **única fonte de verdade** para dados financeiros operacionais.

---

## 2. PRINCÍPIO FUNDAMENTAL

### 🔒 O Webhook é AUTORIDADE MÁXIMA

| Regra | Descrição |
|-------|-----------|
| Webhook > CSV | CSV nunca sobrescreve webhook |
| Webhook > API | Dados de API são complementares |
| Webhook > Manual | Edições manuais são proibidas |

---

## 3. FLUXO DE PROCESSAMENTO

```
┌─────────────────┐
│  Provider       │
│  (Hotmart)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  hotmart-       │
│  webhook        │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────┐               ┌─────────────────┐
│  provider_      │               │  Orders Core    │
│  event_log      │               │  (orders,       │
│  (raw backup)   │               │   order_items)  │
└─────────────────┘               └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │  Ledger         │
                                  │  (ledger_events)│
                                  └─────────────────┘
```

---

## 4. TABELAS AFETADAS

### 4.1 Escrita Direta

| Tabela | Momento |
|--------|---------|
| `provider_event_log` | Sempre (backup raw) |
| `orders` | Sempre |
| `order_items` | Sempre |
| `ledger_events` | Em eventos de aprovação |
| `crm_contacts` | Criação/atualização |
| `crm_transactions` | Espelhamento CRM |

### 4.2 Escrita Condicional

| Tabela | Condição |
|--------|----------|
| `offer_mappings` | Se oferta desconhecida (fallback) |

---

## 5. EVENTOS PROCESSADOS

### Hotmart

| Evento | Ação |
|--------|------|
| `PURCHASE_COMPLETE` | Cria order + items + ledger |
| `PURCHASE_APPROVED` | Atualiza status + cria ledger |
| `PURCHASE_CANCELED` | Atualiza status |
| `PURCHASE_REFUNDED` | Atualiza status + ledger negativo |
| `PURCHASE_CHARGEBACK` | Atualiza status + ledger negativo |
| `PURCHASE_PROTEST` | Atualiza status |
| `PURCHASE_DELAYED` | Atualiza status |
| `PURCHASE_BILLET_PRINTED` | Atualiza status |

---

## 6. IDEMPOTÊNCIA

### 6.1 Regra

O webhook deve ser **idempotente**: processar o mesmo evento múltiplas vezes não deve criar duplicatas.

### 6.2 Implementação

```typescript
// Verificar existência antes de inserir
const { data: existing } = await supabase
  .from('orders')
  .select('id')
  .eq('provider_order_id', orderId)
  .eq('project_id', projectId)
  .maybeSingle();

if (existing) {
  // Atualizar, não inserir
  await supabase
    .from('orders')
    .update({ status, updated_at: new Date() })
    .eq('id', existing.id);
} else {
  // Inserir novo
  await supabase.from('orders').insert({...});
}
```

### 6.3 Chave de Idempotência

```
(project_id, provider_order_id)
```

Para itens:
```
(order_id, provider_transaction_id)
```

---

## 7. INTEGRIDADE ESTRUTURAL

### 7.1 Order Items

`order_items` são criados **independentemente do status** para garantir integridade estrutural.

```typescript
// Criar items mesmo para pedidos pendentes
for (const item of items) {
  await createOrderItem(orderId, item);
}
```

### 7.2 Ledger Events

`ledger_events` são criados **apenas em eventos de aprovação**.

```typescript
if (status === 'approved' || status === 'complete') {
  await createLedgerEvent(orderId, transactionId, amount);
}
```

---

## 8. METADADOS DE PAGAMENTO

### 8.1 Backfill Idempotente

Metadados de pagamento (método, parcelas) são preenchidos via backfill idempotente em eventos de aprovação.

```typescript
await supabase
  .from('orders')
  .update({
    payment_method,
    installments,
    updated_at: new Date()
  })
  .eq('id', orderId)
  .is('payment_method', null); // Só se ainda não tiver
```

---

## 9. FALLBACK DE OFFER MAPPINGS

### 9.1 Condição

Se uma venda chega com `provider_offer_id` desconhecido:

### 9.2 Ação

Criar automaticamente em `offer_mappings`:

```typescript
await supabase.from('offer_mappings').insert({
  project_id,
  provider: 'hotmart',
  codigo_oferta: providerOfferId,
  nome_oferta: offerName || 'Oferta (via venda)',
  id_funil: 'A Definir',
  origem: 'sale_fallback'
});
```

### 9.3 Restrição

❗ **Isso NÃO afeta o processamento financeiro.**

O fallback é apenas para catálogo semântico.

---

## 10. LOGGING E AUDITORIA

### 10.1 provider_event_log

Todo evento raw é armazenado para auditoria:

```typescript
await supabase.from('provider_event_log').insert({
  project_id,
  provider: 'hotmart',
  event_type: hotmartEvent,
  transaction: transactionId,
  payload: rawPayload,
  processed_at: new Date()
});
```

### 10.2 Reconstrução

Este log permite reconstruir o estado do sistema em caso de falha.

---

## 11. AÇÕES PROIBIDAS

| Ação | Consequência |
|------|--------------|
| ❌ Modificar lógica financeira | ERRO GRAVE |
| ❌ Ignorar eventos de aprovação | ERRO GRAVE |
| ❌ Criar dados sem idempotência | Duplicatas |
| ❌ Sobrescrever dados de webhook com CSV | Perda de integridade |
| ❌ Processar sem backup em event_log | Perda de auditoria |

---

## 12. EDGE FUNCTION

### `hotmart-webhook/index.ts`

Responsabilidades:
1. Validar autenticidade do webhook
2. Salvar evento raw em `provider_event_log`
3. Processar evento conforme tipo
4. Criar/atualizar Orders Core
5. Criar ledger_events se aprovação
6. Atualizar CRM
7. Fallback de offer_mappings se necessário

---

## 13. INVARIANTES

| Invariante | Descrição |
|------------|-----------|
| Idempotência | Mesmo evento = mesmo resultado |
| Completude | Todo evento é logado |
| Ordenação | Eventos processados na ordem recebida |
| Atomicidade | Falha parcial = retry completo |

---

*Este documento é a fonte oficial de verdade para o domínio de Ingestão de Eventos.*
