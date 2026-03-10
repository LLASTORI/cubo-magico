# Hotmart Webhook — Test Scenarios

Este documento define cenários de teste para validar o fluxo canônico e idempotente do webhook:

Hotmart → Webhook → provider_event_log → hotmart_sales → sales_core_events → finance_ledger → orders_shadow (safe)

---

## 1) PURCHASE_APPROVED event

### Input (resumo)
- `event = PURCHASE_APPROVED`
- `data.purchase.transaction` válido
- `data.product` (ou `data.purchase.product`) com `id` e `name`
- `data.commissions` contendo ao menos PRODUCER (+ opcional MARKETPLACE/AFFILIATE/COPRODUCER)

### Expected behavior
- **hotmart_sales**: cria/atualiza venda por `(project_id, transaction_id)` com status aprovado.
- **sales_core_events**: cria evento canônico `purchase` ativo (`provider_event_id` único por transação+evento).
- **finance_ledger**: grava entradas de crédito (comissões), sem duplicar em reprocessamento.
- **orders**: cria/atualiza pedido shadow com `provider_order_id` resolvido e valores financeiros do evento.
- **order_items**: cria/upsert de itens com chave de conflito `(order_id, provider_product_id, provider_offer_id)`.

---

## 2) PURCHASE_COMPLETE event

### Input (resumo)
- `event = PURCHASE_COMPLETE`
- Mesmo `transaction` de fluxo válido
- Produto/oferta presentes

### Expected behavior
- **hotmart_sales**: venda persiste via upsert atômico (sem race de SELECT+INSERT).
- **sales_core_events**: cria evento canônico consistente com mapeamento de `PURCHASE_COMPLETE`.
- **finance_ledger**: grava entradas financeiras de crédito quando houver comissões.
- **orders**: mantém consistência de agregação financeira sem duplicar transação já mapeada.
- **order_items**: mantém consistência por item+oferta (evita colisão entre ofertas diferentes do mesmo produto).

---

## 3) Duplicate webhook event (mesmo payload id/evento)

### Input (resumo)
- Reenvio idêntico de um evento já processado.

### Expected behavior
- **provider_event_log**: evento já marcado como `processed` deve ser detectado.
- **HTTP response**: webhook retorna **200** com mensagem de duplicado já processado.
- **hotmart_sales**: não deve quebrar; duplicidade tratada como sucesso idempotente.
- **sales_core_events**: duplicidade (ex. 23505) tratada como sucesso, reaproveitando evento existente.
- **finance_ledger**: entradas duplicadas devem ser ignoradas por constraint/controle de idempotência.
- **orders / order_items**: não devem gerar duplicações inconsistentes.

---

## 4) Webhook retry (retry de infraestrutura)

### Input (resumo)
- Retry automático da Hotmart por timeout/rede, com mesmo `transaction`.

### Expected behavior
- **hotmart_sales**: upsert atômico mantém uma única venda lógica.
- **sales_core_events**: mesma semântica de idempotência por `provider_event_id`.
- **finance_ledger**: duplicatas financeiras não acumulam indevidamente.
- **orders**: transação já mapeada em `provider_order_map` não reimpacta financeiro.
- **order_items**: upsert impede duplicação indevida de item.
- **webhook**: retry não deve causar HTTP 500 por cenário de duplicidade.

---

## 5) Bump transaction with parent

### Input (resumo)
- Transação de bump com `purchase.order_bump.is_order_bump = true`
- `purchase.order_bump.parent_purchase_transaction` preenchido

### Expected behavior
- **orders**: `resolveHotmartOrderId()` deve agrupar bump no pedido pai.
- **order_items**: item do bump deve entrar no pedido agrupado (chave inclui oferta para evitar colisão).
- **hotmart_sales**: venda da transação é registrada normalmente no pipeline principal.
- **sales_core_events / finance_ledger**: eventos e lançamentos financeiros seguem transação recebida, com idempotência.

---

## 6) Event without product

### Input (resumo)
- Evento válido, porém sem `data.product` e sem `data.purchase.product` (e sem `payload.product`).

### Expected behavior
- **hotmart_sales**: registro deve continuar (com fallback de nome/código quando aplicável), sem quebrar webhook.
- **sales_core_events**: evento canônico continua sendo processado.
- **finance_ledger**: continua baseado em `commissions`.
- **orders**: pedido shadow segue não-bloqueante.
- **order_items**: itens sem `provider_product_id` devem ser pulados (sem inserir linha inválida).
- **webhook**: retorna sucesso do pipeline principal; falhas de shadow não bloqueiam.

---

## Resultado esperado (go-live)

- ✔ vendas sempre entram
- ✔ webhook nunca quebra
- ✔ race condition eliminada
- ✔ order_items consistente
- ✔ orders shadow isolado

Arquitetura final:

```text
Hotmart
   ↓
Webhook
   ↓
provider_event_log
   ↓
hotmart_sales
   ↓
sales_core_events
   ↓
finance_ledger
   ↓
orders_shadow (safe)
```
