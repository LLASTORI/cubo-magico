# LAUNCH_PHASES_AUDIT_PROMPT

Leia `debug_log.md`, `TASKS.md`, `FUNNEL_MODELS.md` e `CLAUDE.md` antes de começar.
Preciso de uma auditoria completa da estrutura de fases de lançamento e como ela se conecta
com offer_mappings e produtos. Somente leitura — sem alterar nada.

Salve o resultado em `docs/LAUNCH_PHASES_AUDIT.md` e atualize o `debug_log.md`.

---

## 1. Banco de dados — Fases

- Qual é a estrutura completa da tabela `launch_phases`? (todas as colunas)
- Qual é a estrutura de `phase_campaigns`?
- Qual é a estrutura de `launch_products`?
- Como essas tabelas se relacionam com `funnels` e `offer_mappings`?
- Existe alguma coluna em `offer_mappings` que liga uma oferta a uma fase específica (`phase_id` ou similar)?
- Quantos registros existem em cada uma dessas tabelas hoje?

## 2. Banco de dados — Offer Mappings

- Quais colunas existem em `offer_mappings` hoje?
- Como uma oferta é associada a um funil? (`funnel_id`, `id_funil` ou outro campo?)
- Existe alguma forma de distinguir "FRONT da fase de ingressos" vs "FRONT da fase de pitch" hoje?
- O campo `tipo_posicao` (FRONT/OB/US/DS) é o único diferenciador de posição?

## 3. Frontend — Configuração de Lançamento

- No fluxo de configuração de um funil de lançamento, como o usuário cadastra as fases?
- Qual componente gerencia isso? (`LaunchConfigDialog` ou outro?)
- O usuário consegue hoje associar ofertas específicas a fases específicas?
- Como `launch_products` é populado — pelo usuário ou automaticamente?

## 4. Frontend — Análise de Lançamento

- Como `useLaunchData.ts` usa as fases para calcular métricas?
- As métricas são separadas por fase ou agregadas no total do lançamento?
- O dashboard de lançamento mostra métricas por fase? Como?

## 5. Diagnóstico

- É possível hoje ter um lançamento pago com:
  - Fase 1: vendas de ingressos (com seu próprio FRONT/OB/US/DS)
  - Fase 2: pitch do produto principal (com seu próprio FRONT/OB/US/DS)
  - Métricas separadas por fase?
- Se não é possível, qual é a principal limitação técnica?
- O que precisaria ser adicionado/alterado para suportar isso?

## 6. Conclusão

- Resumo do estado atual em 5 pontos
- O que já existe e pode ser aproveitado
- O que falta para suportar o modelo de lançamento pago completo
