# CRM Automation Events: Eventos Canônicos por Pedido

**Data:** 2026-01-16  
**Status:** ✅ Shadow Implementado  
**Próximo:** PROMPT 20 - Desligar CRM Legacy

---

## 📋 Resumo Executivo

Automações agora podem usar **eventos por pedido**, não por transação/item.

| Abordagem | Fonte | Evento por | Status |
|-----------|-------|------------|--------|
| Legado | `crm_transactions` | Item/Transação | ❌ Transitório |
| Canônico | `orders` | Pedido | ✅ Shadow |

---

## 🚫 Por que Eventos por Item São Errados

### Problema: Múltiplos Disparos

Quando um cliente compra 1 pedido com 3 produtos:

```
Legado (crm_transactions):
├── Transação 1: Produto A → dispara automação
├── Transação 2: Produto B → dispara automação (DUPLICADO!)
└── Transação 3: Produto C → dispara automação (DUPLICADO!)

Resultado: 3 emails/WhatsApp/notificações
```

### Impacto Real

| Canal | Problema |
|-------|----------|
| **WhatsApp** | Cliente recebe 3 mensagens de boas-vindas |
| **Email** | 3 emails de confirmação |
| **IA/Automação** | Análise errada de comportamento |
| **Métricas** | Taxa de conversão inflada |

---

## ✅ Solução: Eventos por Pedido

### Nova Abordagem

```
Canônico (Orders Core):
└── Pedido 1: 3 produtos → dispara 1 evento

Resultado: 1 email/WhatsApp/notificação
```

### Tipos de Evento

| event_type | Descrição | Quando Dispara |
|------------|-----------|----------------|
| `first_order` | Primeira compra do contato | Sequência = 1 |
| `repeat_order` | Recompra | Sequência > 1 |

---

## 🗃️ View SQL

### `crm_order_automation_events_view`

```sql
CREATE OR REPLACE VIEW public.crm_order_automation_events_view AS
SELECT 
  o.id AS order_id,
  c.id AS contact_id,
  o.buyer_email AS contact_email,
  
  -- Tipo de evento baseado na sequência
  CASE 
    WHEN ROW_NUMBER() OVER (
      PARTITION BY o.buyer_email, o.project_id 
      ORDER BY o.ordered_at
    ) = 1 THEN 'first_order'
    ELSE 'repeat_order'
  END AS event_type,
  
  -- Sequência do pedido (1, 2, 3...)
  ROW_NUMBER() OVER (...) AS order_sequence,
  
  -- Valor e contexto
  o.customer_paid AS order_value,
  o.ordered_at,
  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items_count,
  (SELECT product_name FROM order_items WHERE order_id = o.id LIMIT 1) AS main_product_name
  
FROM orders o
LEFT JOIN crm_contacts c ON c.email = o.buyer_email
WHERE o.status = 'approved';
```

---

## 🧪 Prova: Juliane Coeli

### Email: `julianebborba@gmail.com`

### Comparação

| Sistema | Eventos | Detalhe |
|---------|---------|---------|
| **Legado** | 3 transações | 3 disparos de automação |
| **Canônico** | 1 evento | `first_order`, sequence=1, 3 items |

### Dados da View Canônica

```json
{
  "contact_email": "julianebborba@gmail.com",
  "event_type": "first_order",
  "order_sequence": 1,
  "order_value": 205,
  "items_count": 3,
  "main_product_name": "Make Rápida em 13 Minutos com Alice Salazar"
}
```

**Resultado:** ✅ 1 evento, não 3.

---

## 🪝 Hook Shadow

### `useCRMOrderAutomationEvents.ts`

```typescript
import { useCRMOrderAutomationEvents } from '@/hooks/useCRMOrderAutomationEvents';

// Todos os eventos
const { events, firstOrderEvents, repeatOrderEvents } = useCRMOrderAutomationEvents();

// Eventos de um contato
const { events } = useCRMOrderAutomationEvents({ 
  contactEmail: 'cliente@email.com' 
});

// Só primeiras compras
const { events } = useCRMOrderAutomationEvents({ 
  eventType: 'first_order' 
});
```

### Interface

```typescript
interface OrderAutomationEvent {
  order_id: string;
  contact_id: string | null;
  contact_email: string;
  event_type: 'first_order' | 'repeat_order';
  order_sequence: number;
  order_value: number;
  items_count: number;
  main_product_name: string | null;
  ordered_at: string;
  // ...utm, provider, funnel
}
```

---

## 📊 Impacto por Canal

### WhatsApp

| Antes | Depois |
|-------|--------|
| 3 mensagens para 1 pedido | 1 mensagem para 1 pedido |
| Template: "Parabéns pela compra de {produto}!" × 3 | Template: "Parabéns pelo pedido de {valor}!" × 1 |

### Email

| Antes | Depois |
|-------|--------|
| 3 emails de confirmação | 1 email com resumo do pedido |
| Cliente marca como spam | Cliente satisfeito |

### IA/Agentes

| Antes | Depois |
|-------|--------|
| "Cliente comprou 3 vezes" (errado) | "Cliente fez 1 pedido com 3 produtos" |
| Predição de churn errada | Predição baseada em comportamento real |

---

## 📜 Regra Canônica

```
╔══════════════════════════════════════════════════════════════════╗
║          REGRA CANÔNICA DE EVENTOS DE AUTOMAÇÃO                 ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. 1 pedido = 1 evento de automação                            ║
║                                                                  ║
║  2. Items são contexto, não gatilho                             ║
║     - items_count mostra quantos produtos                        ║
║     - main_product_name identifica o principal                   ║
║                                                                  ║
║  3. Tipos de evento:                                            ║
║     - first_order → sequência = 1                                ║
║     - repeat_order → sequência > 1                               ║
║                                                                  ║
║  4. Transações (crm_transactions) NÃO geram eventos             ║
║                                                                  ║
║  5. Ledger NUNCA dispara automações                             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 📁 Arquivos Criados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `crm_order_automation_events_view` | View SQL | Eventos canônicos por pedido |
| `src/hooks/useCRMOrderAutomationEvents.ts` | Hook | Consome view de eventos |
| `docs/CRM_AUTOMATION_EVENTS_ORDERS.md` | Doc | Este documento |

---

## 🚫 O que NÃO foi alterado

- ❌ Automações existentes (continuam funcionando)
- ❌ `automation_flows` / `automation_executions`
- ❌ Triggers de CRM legado
- ❌ WhatsApp/Email existentes

---

## 🔜 Critérios para Migrar Automações

1. ✅ View `crm_order_automation_events_view` criada
2. ✅ Hook `useCRMOrderAutomationEvents` implementado
3. ✅ Prova com Juliane validada
4. ⏳ Automações consumindo nova view
5. ⏳ 7+ dias sem incidentes
6. ⏳ Desligar triggers de `crm_transactions`

---

## 🔜 Próximos Passos

| Prompt | Objetivo |
|--------|----------|
| **PROMPT 20** | Deprecar CRM Legacy com segurança |
| **PROMPT 21** | Migrar automações de WhatsApp |
| **PROMPT 22** | Migrar automações de Email |

---

## ✅ Checklist PROMPT 19

- [x] View `crm_order_automation_events_view` criada
- [x] Prova com Juliane: 1 evento, não 3
- [x] Hook `useCRMOrderAutomationEvents` implementado
- [x] Documentação completa
- [x] Regra canônica documentada
- [x] Automações existentes intactas
