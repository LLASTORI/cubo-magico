# CRM ARCHITECTURE CANONICAL MAP

> **Documento Oficial de Arquitetura do CRM do Cubo Mágico**  
> Versão: 1.0  
> Data: 2026-01-16  
> Status: DEFINITIVO

---

## 📋 SUMÁRIO EXECUTIVO

Este documento define a arquitetura oficial do módulo CRM do Cubo Mágico, separando claramente:
- **NÚCLEO** (contexto do cliente)
- **SISTEMAS OPERACIONAIS** (ação)
- **VISUALIZAÇÕES DERIVADAS** (dashboards/atalhos)

---

## 1️⃣ INVENTÁRIO COMPLETO DO CRM

### 1.1 Páginas e Rotas

| # | Nome da Tela | Rota | Fonte de Dados Principal | Ação Principal | Depende do CRM? |
|---|--------------|------|--------------------------|----------------|-----------------|
| 1 | **CRM - Análises** | `/crm` | `crm_contacts`, `crm_transactions` (legado) | Visualizar jornada agregada | ✅ Sim |
| 2 | **Comportamento UTM** | `/crm/utm-behavior` | `crm_utm_behavior_view` | Analisar origem de contatos | ✅ Sim |
| 3 | **Pipeline (Kanban)** | `/crm/kanban` | `crm_contacts`, `pipeline_stages` | Mover contatos entre estágios | ✅ Sim |
| 4 | **Cartão do Contato** | `/crm/contact/:contactId` | `crm_contacts`, `orders`, múltiplos hooks | Visualizar contexto completo | ✅ Sim (núcleo) |
| 5 | **Configurar Pipeline** | `/crm/pipeline-settings` | `pipeline_stages` | Criar/editar estágios | ✅ Sim |
| 6 | **Atividades** | `/crm/activities` | `crm_activities` | Gerenciar tarefas | ✅ Sim |
| 7 | **Cadências** | `/crm/cadences` | `crm_cadences` | Configurar follow-ups automáticos | ✅ Sim |
| 8 | **Recuperação - Analytics** | `/crm/recovery` | `crm_transactions` (negativas) | Analisar reembolsos/chargebacks | ✅ Sim |
| 9 | **Recuperação - Kanban** | `/crm/recovery/kanban` | `crm_contacts`, `recovery_stages` | Mover contatos em recuperação | ✅ Sim |
| 10 | **Recuperação - Settings** | `/crm/recovery/settings` | `recovery_stages` | Configurar estágios | ✅ Sim |
| 11 | **Automações** | `/automations` | `automation_flows` | Criar fluxos automáticos | ❌ Não (módulo próprio) |
| 12 | **Chat ao Vivo / WhatsApp** | `/whatsapp` | `whatsapp_conversations`, `whatsapp_messages` | Conversar com clientes | ❌ Não (módulo próprio) |

### 1.2 Componentes do Cartão do Contato

| # | Componente | Arquivo | Função | Tipo |
|---|------------|---------|--------|------|
| 1 | **ContactIdentityTab** | `ContactIdentityTab.tsx` | Dados declarados/inferidos | 🟦 Núcleo |
| 2 | **ContactJourneyTab** | `ContactJourneyTab.tsx` | Timeline de interações (legado) | 🟦 Núcleo |
| 3 | **ContactTransactionsList** | `ContactTransactionsList.tsx` | Histórico de pedidos (Orders Core) | 🟦 Núcleo |
| 4 | **ContactOrdersMetricsCard** | `ContactOrdersMetricsCard.tsx` | LTV/métricas canônicas | 🟦 Núcleo |
| 5 | **ContactOrdersAttributionCard** | `ContactOrdersAttributionCard.tsx` | UTM por pedido | 🟦 Núcleo |
| 6 | **ContactActivitiesList** | `ContactActivitiesList.tsx` | Tarefas pendentes | 🟧 Operacional |
| 7 | **ContactWhatsAppHistory** | `ContactWhatsAppHistory.tsx` | Histórico de conversas | 🟦 Núcleo (leitura) |
| 8 | **ContactCognitiveProfile** | `ContactCognitiveProfile.tsx` | Perfil comportamental | 🟦 Núcleo |
| 9 | **ContactAIRecommendations** | `ContactAIRecommendations.tsx` | Sugestões de IA | 🟧 Operacional |
| 10 | **ContactAgentSuggestions** | `ContactAgentSuggestions.tsx` | Decisões de agentes | 🟧 Operacional |
| 11 | **ContactMemoryCard** | `ContactMemoryCard.tsx` | Memória de longo prazo | 🟦 Núcleo |
| 12 | **ContactSegmentInsights** | `ContactSegmentInsights.tsx` | Comparação com segmento | 🟨 Visualização |
| 13 | **ContactQuizzesTab** | `ContactQuizzesTab.tsx` | Respostas de quizzes | 🟦 Núcleo |
| 14 | **ContactSurveysTab** | `ContactSurveysTab.tsx` | Respostas de pesquisas | 🟦 Núcleo |
| 15 | **ContactSocialTab** | `ContactSocialTab.tsx` | Comentários sociais | 🟦 Núcleo |

### 1.3 Hooks do CRM

| # | Hook | Arquivo | Função | Status |
|---|------|---------|--------|--------|
| 1 | `useCRMContact` | `useCRMContact.ts` | CRUD de contato | ✅ Ativo |
| 2 | `useCRMJourneyData` | `useCRMJourneyData.ts` | Jornada por transação | ⚠️ LEGADO |
| 3 | `useCRMJourneyOrders` | `useCRMJourneyOrders.ts` | Jornada por pedido | ✅ CANÔNICO |
| 4 | `useCRMContactOrdersMetrics` | `useCRMContactOrdersMetrics.ts` | LTV por pedido | ✅ CANÔNICO |
| 5 | `useCRMOrderAutomationEvents` | `useCRMOrderAutomationEvents.ts` | Eventos de automação | ✅ CANÔNICO |
| 6 | `useCRMActivities` | `useCRMActivities.ts` | Gerenciamento de atividades | ✅ Ativo |
| 7 | `useCRMCadences` | `useCRMCadences.ts` | Gerenciamento de cadências | ✅ Ativo |
| 8 | `useCRMContactJourney` | `useCRMContactJourney.ts` | Interações do contato | ✅ Ativo |
| 9 | `useCRMWebhookKeys` | `useCRMWebhookKeys.ts` | Chaves de webhook | ✅ Ativo |
| 10 | `usePipelineStages` | `usePipelineStages.ts` | Estágios do pipeline | ✅ Ativo |
| 11 | `useRecoveryStages` | `useRecoveryStages.ts` | Estágios de recuperação | ✅ Ativo |
| 12 | `useRecoveryOrders` | `useRecoveryOrders.ts` | Pedidos em recuperação | ✅ Ativo |
| 13 | `useContactIdentity` | `useContactIdentity.ts` | Identidade declarada | ✅ Ativo |
| 14 | `useContactMemory` | `useContactMemory.ts` | Memória de longo prazo | ✅ Ativo |
| 15 | `useContactProfile` | `useContactProfile.ts` | Perfil cognitivo | ✅ Ativo |
| 16 | `useContactPredictions` | `useContactPredictions.ts` | Previsões de IA | ✅ Ativo |
| 17 | `useContactQuizzes` | `useContactQuizzes.ts` | Quizzes respondidos | ✅ Ativo |
| 18 | `useContactOrdersAttribution` | `useContactOrdersAttribution.ts` | UTM de pedidos | ✅ CANÔNICO |
| 19 | `useUTMBehaviorData` | `useUTMBehaviorData.ts` | Comportamento por UTM | ✅ Ativo |

### 1.4 Componentes de Análise Agregada

| # | Componente | Arquivo | Função |
|---|------------|---------|--------|
| 1 | **CustomerJourneyAnalysis** | `CustomerJourneyAnalysis.tsx` | Análise de jornada (LEGADO) |
| 2 | **CustomerJourneyOrders** | `CustomerJourneyOrders.tsx` | Jornada por pedido (CANÔNICO) |
| 3 | **AscensionAnalysis** | `AscensionAnalysis.tsx` | Análise de ascensão |
| 4 | **CustomerFlowChart** | `CustomerFlowChart.tsx` | Fluxo de produtos |
| 5 | **RecoveryAnalytics** | `RecoveryAnalytics.tsx` | Analytics de recuperação |
| 6 | **UTMBehaviorTable** | `UTMBehaviorTable.tsx` | Tabela de UTM |
| 7 | **CRMSummaryCards** | `CRMSummaryCards.tsx` | Cards de resumo |
| 8 | **BulkActionsBar** | `BulkActionsBar.tsx` | Ações em lote |

---

## 2️⃣ CLASSIFICAÇÃO CANÔNICA

### 🟦 A) CRM — NÚCLEO (Contexto do Cliente)

> **Critério**: Responde "quem é o cliente", mostra histórico consolidado, não executa ações automáticas.

| Item | Justificativa |
|------|---------------|
| **Cartão do Contato** (`/crm/contact/:id`) | Centro de verdade sobre o cliente |
| **ContactIdentityTab** | Dados declarados e inferidos |
| **ContactTransactionsList** | Histórico canônico de pedidos |
| **ContactOrdersMetricsCard** | LTV e métricas canônicas |
| **ContactOrdersAttributionCard** | UTM canônico por pedido |
| **ContactCognitiveProfile** | Perfil comportamental |
| **ContactMemoryCard** | Memória de longo prazo |
| **ContactQuizzesTab** | Respostas de quizzes |
| **ContactSurveysTab** | Respostas de pesquisas |
| **ContactSocialTab** | Interações sociais |
| **ContactWhatsAppHistory** | Histórico de conversas (leitura) |
| **ContactJourneyTab** | Timeline de interações |
| **CustomerJourneyOrders** | Jornada por pedido (canônico) |

### 🟧 B) SISTEMAS OPERACIONAIS (Ação)

> **Critério**: Executa ações, dispara mensagens, possui regras, atua SOBRE o cliente.

| Item | Justificativa | Recomendação |
|------|---------------|--------------|
| **Pipeline Kanban** (`/crm/kanban`) | Move contatos entre estágios | ✅ Manter no CRM |
| **Pipeline Settings** (`/crm/pipeline-settings`) | Configura estágios | ✅ Manter no CRM |
| **Atividades** (`/crm/activities`) | Gerencia tarefas de follow-up | ✅ Manter no CRM |
| **Cadências** (`/crm/cadences`) | Automação de follow-ups | 🔁 Sub-área de Automações |
| **Recuperação - Kanban** (`/crm/recovery/kanban`) | Gestão ativa de recuperação | ✅ Manter no CRM |
| **Recuperação - Settings** (`/crm/recovery/settings`) | Configura estágios | ✅ Manter no CRM |
| **ContactActivitiesList** | Tarefas do contato | ✅ Manter no CRM |
| **ContactAIRecommendations** | Sugestões acionáveis | ✅ Manter (contexto) |
| **ContactAgentSuggestions** | Decisões de agentes | ✅ Manter (contexto) |
| **Automações** (`/automations`) | Fluxos automáticos | 🚚 Módulo próprio |
| **Chat ao Vivo** (`/whatsapp`) | Conversas ativas | 🚚 Módulo próprio |

### 🟨 C) VISUALIZAÇÕES / ATALHOS

> **Critério**: Não é fonte de verdade, apenas agrega, filtra ou facilita acesso.

| Item | Justificativa | Recomendação |
|------|---------------|--------------|
| **CRM - Análises** (`/crm`) | Dashboard agregado | 🔁 Renomear para "Visão Geral" |
| **Comportamento UTM** (`/crm/utm-behavior`) | Análise de origem | ✅ Manter |
| **Recuperação - Analytics** (`/crm/recovery`) | Dashboard de perdas | ✅ Manter |
| **CustomerJourneyAnalysis** | Jornada legada | ❌ Depreciar após migração |
| **AscensionAnalysis** | Análise de ascensão | ✅ Manter |
| **CustomerFlowChart** | Fluxo de produtos | ✅ Manter |
| **CRMSummaryCards** | Cards de resumo | ✅ Manter |
| **ContactSegmentInsights** | Comparação de segmento | ✅ Manter |
| **BulkActionsBar** | Ações em lote | ✅ Manter |

---

## 3️⃣ DECISÕES OBRIGATÓRIAS

### ✅ DEVE CONTINUAR NO CRM

| Item | Motivo |
|------|--------|
| Cartão do Contato | Centro de verdade do cliente |
| Pipeline Kanban | Gestão operacional de leads |
| Pipeline Settings | Configuração do pipeline |
| Atividades | Tarefas vinculadas a contatos |
| Recuperação (Kanban + Settings + Analytics) | Gestão de clientes em risco |
| Comportamento UTM | Análise de origem |
| Todos os componentes de Contact* | Contexto do cliente |

### 🔁 DEVE VIRAR SUB-ÁREA

| Item | Nova Estrutura | Motivo |
|------|----------------|--------|
| Cadências | CRM → Atividades → Cadências | É extensão de atividades |
| CRM - Análises | CRM → Visão Geral | Nome mais claro |

### 🚚 DEVE SER MOVIDO PARA OUTRO MÓDULO

| Item | Novo Módulo | Motivo |
|------|-------------|--------|
| Automações (`/automations`) | Módulo Automações | Já é separado nas rotas |
| Chat ao Vivo (`/whatsapp`) | Módulo Conversas | Sistema operacional, não contexto |

### ❌ DEVE SER DESCONTINUADO

| Item | Prazo | Substituto |
|------|-------|------------|
| `CustomerJourneyAnalysis.tsx` | Após validação | `CustomerJourneyOrders.tsx` |
| `useCRMJourneyData.ts` | Após validação | `useCRMJourneyOrders.ts` |
| Métricas por transação | Após validação | Métricas por pedido |

---

## 4️⃣ PROPOSTA DE NOVA ESTRUTURA DE NAVEGAÇÃO

### 📂 CRM (Módulo Principal)

```
CRM
├── 📊 Visão Geral (dashboard agregado)
│   ├── Jornada do Cliente (Orders Core)
│   └── Análise de Ascensão
│
├── 📈 Comportamento UTM
│
├── 🎯 Pipeline
│   ├── Kanban
│   └── ⚙️ Configurações
│
├── ✅ Atividades
│   ├── Lista de Atividades
│   └── 🔄 Cadências
│
├── 🔄 Recuperação
│   ├── Analytics
│   ├── Kanban
│   └── ⚙️ Configurações
│
└── 👤 Contato (/:contactId)
    ├── Visão Geral
    ├── Pedidos (Orders Core)
    ├── Jornada
    ├── Conversas
    ├── Quizzes/Pesquisas
    ├── Social
    ├── Atividades
    └── IA/Sugestões
```

### 📂 Módulos Separados (Fora do CRM)

```
Automações (módulo próprio)
├── Fluxos
├── Editor de Fluxo
└── Execuções

Conversas / WhatsApp (módulo próprio)
├── Chat ao Vivo
└── Histórico

Busca Rápida (atalho global - já fora do CRM)
```

---

## 5️⃣ AVALIAÇÃO DE PROBLEMAS ATUAIS

### 5.1 Telas que Misturam Contexto + Ação

| Tela | Problema | Impacto |
|------|----------|---------|
| CRMSubNav | Inclui Automações e WhatsApp | Confusão sobre o que é CRM |
| Cartão do Contato | Atividades + Sugestões de IA misturadas | OK (contextual) |

### 5.2 Fluxos com Problemas

| Fluxo | Problema | Causa Provável |
|-------|----------|----------------|
| CRM → Automações → Voltar | Reset de contexto | Rotas separadas sem state compartilhado |
| CRM → WhatsApp → Voltar | Perde filtros | Navegação não preserva estado |
| Cartão do Contato | Múltiplas tabs com queries | Queries não otimizadas |

### 5.3 Possíveis Causas de Lentidão

| Área | Problema | Solução Proposta |
|------|----------|------------------|
| `CustomerJourneyAnalysis` | Joins pesados com `crm_transactions` | Migrar para Orders Core |
| `useCRMJourneyData.ts` | Processa todos os contatos client-side | Usar view materializada |
| `CRMKanban` | Carrega todos os contatos | Paginação + filtros server-side |
| `CRMRecoveryKanban` | Carrega todos os contatos | Paginação + filtros server-side |
| Cartão do Contato | 15+ hooks paralelos | Considerar agregação |

### 5.4 Links e Rotas com Problemas

| Problema | Local | Causa |
|----------|-------|-------|
| Automações na CRMSubNav | `CRMSubNav.tsx` | Não é CRM, confunde usuário |
| WhatsApp na CRMSubNav | `CRMSubNav.tsx` | Não é CRM, confunde usuário |

---

## 6️⃣ CONCLUSÃO ARQUITETURAL

### 🎯 DEFINIÇÃO OFICIAL: "O que é CRM no Cubo Mágico"

> **CRM é o módulo que CONTÉM E APRESENTA o contexto do cliente.**
> 
> Ele responde às perguntas:
> - Quem é esse cliente?
> - O que ele comprou?
> - De onde ele veio?
> - Como ele se comporta?
> - Em que estágio está?
> 
> **CRM NÃO é onde ações são executadas** — é onde INFORMAÇÕES são consolidadas.

### 🚫 O QUE NUNCA MAIS DEVE SER COLOCADO DENTRO DO CRM

1. **Automações** — são sistemas operacionais, não contexto
2. **Chat ao Vivo** — é ação, não informação
3. **Campanhas de Marketing** — são ações, não contexto
4. **Integrações de Envio** — são execução, não dados
5. **Processamento de Pagamentos** — é ação, não contexto

### ✅ O QUE O CRM SEMPRE DEVE CONTER

1. **Cartão do Cliente** — centro de verdade
2. **Histórico de Pedidos** — via Orders Core
3. **Histórico de Interações** — todas as fontes
4. **Pipeline de Gestão** — estágios de relacionamento
5. **Métricas do Cliente** — LTV, ticket, frequência
6. **Perfil Comportamental** — IA e segmentação
7. **Recuperação** — gestão de clientes em risco

### 📐 PRINCÍPIOS PARA FUTURAS TELAS

1. **Se mostra informação sobre o cliente → CRM**
2. **Se executa ação sobre o cliente → Módulo Operacional**
3. **Se agrega dados de múltiplas fontes → Visualização/Dashboard**
4. **Se dispara mensagem → Automações ou Conversas**
5. **Se tem regras de negócio → Automações**

---

## 7️⃣ PRÓXIMOS PASSOS RECOMENDADOS

### Fase 1: Limpeza de Navegação
- [ ] Remover Automações e WhatsApp da CRMSubNav
- [ ] Renomear "Análises" para "Visão Geral"
- [ ] Mover Cadências para sub-área de Atividades

### Fase 2: Migração de Dados
- [ ] Depreciar `CustomerJourneyAnalysis` após validação
- [ ] Depreciar `useCRMJourneyData` após validação
- [ ] Consolidar métricas em Orders Core

### Fase 3: Performance
- [ ] Implementar paginação no Kanban
- [ ] Otimizar queries do Cartão do Contato
- [ ] Considerar views materializadas para dashboards

### Fase 4: UX
- [ ] Preservar estado na navegação CRM → outros módulos
- [ ] Unificar loading states
- [ ] Implementar skeleton loading consistente

---

## 📎 REFERÊNCIAS

- `docs/CRM_JOURNEY_ORDERS_AUDIT.md` — Auditoria de jornada
- `docs/CRM_CONTACT_LTV_ORDERS.md` — LTV canônico
- `docs/CRM_AUTOMATION_EVENTS_ORDERS.md` — Eventos de automação
- `docs/CUBO_ORDERS_CORE.md` — Arquitetura Orders Core

---

**Documento gerado como base para todas as decisões futuras de CRM.**
