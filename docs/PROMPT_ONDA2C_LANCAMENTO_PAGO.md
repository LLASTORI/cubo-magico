# PROMPT — Onda 2C: Fixes e Adaptações da Tela de Edição

Leia `debug_log.md`, `TASKS.md`, `CLAUDE.md` e `FUNNEL_MODELS.md` antes de começar.
Três correções cirúrgicas. **Nada além do que está aqui.**

Ao finalizar: atualizar `debug_log.md` e `TASKS.md`, commitar tudo.

---

## Tarefa 1 — Corrigir RLS em `launch_phases` e `launch_products`

Ambas as tabelas bloqueiam INSERT com erro de RLS policy.
Verificar as policies existentes e garantir que cobrem ALL (SELECT + INSERT + UPDATE + DELETE)
para membros do projeto — igual ao padrão das outras tabelas do sistema.

Criar migration de correção. Testar criação de fase e vinculação de produto após aplicar.

---

## Tarefa 2 — Corrigir faturamento no nível do funil

Na tela de lançamentos, o funil "teste" mostra faturamento R$0 e ROAS 0,00x.
Mas na tela da edição (LANPG_MAR26) aparecem corretamente: R$19.652 e ROAS 0,34x.

O problema: os dados da edição não estão subindo para o nível do funil pai.

**Verificar e corrigir:**
- O hook que calcula métricas do funil de lançamento pago na listagem principal
- Garantir que soma as métricas de TODAS as edições do funil
- Faturamento total = soma do faturamento de todas as edições
- Investimento = meta_insights no período total do funil (start_date → end_date)
- ROAS = faturamento total / investimento total

**Não alterar** o comportamento para lançamentos clássicos.

---

## Tarefa 3 — Adaptar bloco "Funil de Conversão" para lançamento pago

Na tela de análise da edição, o bloco "Funil de Conversão" usa lógica de
lançamento clássico (busca leads por tag no CRM). Para lançamento pago isso não
se aplica — não existe etapa de captura de lead gratuito.

**Para `funnel_model = 'lancamento_pago'`, substituir o bloco por:**

| Label atual | Label novo | Fonte dos dados |
|---|---|---|
| Leads do Lançamento | Compradores de ingresso | `orders` com ofertas da Fase 1 (ingresso) no período da edição |
| Compradores | Compradores do produto principal | `orders` com ofertas da Fase 4 (vendas) no período da edição |
| Taxa de Conversão (lead→comprador) | TX ingresso→produto | compradores produto / compradores ingresso |
| Receita Total (dos leads convertidos) | Receita produto principal | soma `customer_paid` das vendas do produto |
| Ticket Médio (por comprador) | Ticket médio | receita produto / compradores produto |

**Como identificar as ofertas por fase:**
- Fase 1 (ingressos) = `offer_mappings` onde `phase_id` aponta para fase com `phase_order = 1` desta edição
- Fase 4 (vendas produto) = `offer_mappings` onde `phase_id` aponta para fase com `phase_order = 4`
- Se `phase_id` for null (ofertas não mapeadas), usar `item_type = 'main'` como fallback

**Abas de UTM abaixo do bloco:**
Manter as abas Campanhas/Conjuntos/Anúncios/Criativos/Jornadas — mas filtrar
pelos dados do produto principal (não por tag de CRM).

**Não alterar** o comportamento do bloco para lançamentos clássicos.

---

## O que NÃO fazer

- Não construir planejador
- Não construir show rate real
- Não mexer na tela de lançamentos clássicos
- Não refatorar seletor de funis

---

## Checklist

- [ ] INSERT em `launch_phases` funciona sem erro de RLS
- [ ] INSERT em `launch_products` funciona sem erro de RLS
- [ ] Faturamento e ROAS aparecem corretamente no nível do funil pai
- [ ] Bloco "Funil de Conversão" mostra compradores de ingresso como base
- [ ] TX ingresso→produto calculada corretamente
- [ ] Lançamentos clássicos não foram afetados
- [ ] Build: zero erros
- [ ] Migrations commitadas
- [ ] `debug_log.md` e `TASKS.md` atualizados
