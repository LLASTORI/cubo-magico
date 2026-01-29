# Contratos Arquiteturais — Cubo Mágico

Esta pasta contém os **contratos técnicos oficiais** do sistema Cubo Mágico.

## O que são contratos?

Contratos são documentos que definem:

- **Regras estruturais** que não podem ser violadas
- **Comportamentos esperados** de componentes críticos
- **Limites de responsabilidade** entre domínios
- **Invariantes** que devem ser preservadas em qualquer mudança

---

## Contratos Ativos

| Contrato | Domínio | Status |
|----------|---------|--------|
| [offer-mappings.md](./offer-mappings.md) | Catálogo de Ofertas | ✅ Ativo |
| [ledger.md](./ledger.md) | Contabilidade Financeira | ✅ Ativo |
| [webhook.md](./webhook.md) | Ingestão de Eventos | ✅ Ativo |
| [providers.md](./providers.md) | Integrações Externas | ✅ Ativo |

---

## Hierarquia de Domínios

```
┌─────────────────────────────────────────────────────────────┐
│                         PROVIDERS                            │
│              (Hotmart, Eduzz, Kiwify - futuro)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         WEBHOOK                              │
│              (Fonte de Verdade Financeira)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│      ORDERS CORE        │   │    OFFER MAPPINGS       │
│  (orders, order_items)  │   │  (Catálogo Semântico)   │
└───────────┬─────────────┘   └─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│         LEDGER          │
│  (Contabilidade Real)   │
└─────────────────────────┘
```

---

## Regras de Governança

### 1. Fonte de Verdade

Esta pasta é a **fonte oficial de verdade arquitetural** do sistema.

### 2. Versionamento

Todos os contratos são versionados junto com o código.

### 3. Conformidade

Qualquer PR que altere comportamento de:
- Catálogo de ofertas
- Funis
- Webhooks
- Providers
- Ledger financeiro
- Orders Core

**DEVE** respeitar os contratos desta pasta.

### 4. Alterações em Contratos

Mudanças em contratos requerem:
- Justificativa técnica documentada
- Análise de impacto em sistemas dependentes
- Aprovação explícita do arquiteto responsável

### 5. Proibições

| Ação | Status |
|------|--------|
| Duplicar regras em outro local | ❌ Proibido |
| Mover para Notion/Confluence | ❌ Proibido |
| Criar documentação paralela | ❌ Proibido |
| Simplificar sem aprovação | ❌ Proibido |

---

## Audiência

- Desenvolvedores
- Produto
- Agentes de IA
- Arquitetos de sistema

---

## Princípios Fundamentais

### Orders Core como Fonte de Verdade

O **Orders Core** (tabelas `orders`, `order_items` e `ledger_events`) é a única fonte de verdade para todo o sistema, incluindo CRM, Jornada, Dashboard e Análises.

### Webhook como Autoridade Financeira

O **Webhook** é a autoridade máxima para dados financeiros. CSVs realizam replay histórico sem sobrescrever dados operacionais.

### Separação de Domínios

- **Offer Mappings**: Catálogo semântico (NÃO financeiro)
- **Ledger**: Contabilidade transacional (financeiro)
- **Orders**: Dados operacionais de vendas

---

*Última atualização: 2026-01-29*
