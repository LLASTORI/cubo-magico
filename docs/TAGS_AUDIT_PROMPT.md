# TAGS_AUDIT_PROMPT — Auditoria do Sistema de Tags

Leia `debug_log.md` e `TASKS.md` antes de começar.
Preciso de uma auditoria completa do sistema de tags do Cubo — somente leitura, sem alterar nada.

Salve o resultado em `docs/TAGS_AUDIT.md` e atualize o `debug_log.md`.

---

## 1. Banco de dados

- Onde as tags são armazenadas? Qual tabela e colunas?
- Como uma tag é associada a um contato/lead?
- Como uma tag é associada a um funil ou lançamento (`launch_tag`)?
- A tabela `crm_contact_interactions` está sendo populada? Quantos registros tem?
- Existe alguma view ou função que agrega tags por contato ou por funil?

---

## 2. Ingestão de tags

- Como as tags chegam hoje? (webhook, CSV, manual, automação)
- Quando um lead compra um ingresso via Hotmart webhook, a tag do lançamento (`launch_tag`) é aplicada ao contato no CRM? Mostrar o trecho de código do webhook responsável por isso.
- O CSV import aplica tags? Como?

---

## 3. Frontend — CRM

- Qual componente exibe as tags de um contato?
- Qual hook busca as tags? De qual tabela/view?
- As tags estão aparecendo na interface ou estão vazias/quebradas?

---

## 4. Frontend — Criação de públicos Meta Ads

- Qual página/componente permite filtrar por tags para criar públicos?
- Qual hook busca as tags disponíveis para filtro?
- De onde vêm as tags listadas? (tabela direta, view, função SQL?)
- Por que as tags não estão aparecendo após a migração?

---

## 5. Diagnóstico

- O que exatamente quebrou com a migração?
- Quais tabelas ou views as tags dependiam que foram alteradas ou dropadas?
- Quais são os pontos de falha identificados?

---

## 6. Plano de correção sugerido

- O que precisa ser corrigido para as tags voltarem a funcionar no CRM?
- O que precisa ser corrigido para as tags voltarem a aparecer na criação de públicos Meta Ads?
- Qual a ordem de prioridade das correções?
