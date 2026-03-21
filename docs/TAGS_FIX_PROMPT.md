# TAGS_FIX_PROMPT — Correção do Sistema de Tags

Leia `debug_log.md`, `TASKS.md` e `docs/TAGS_AUDIT.md` antes de começar.
Implemente as correções identificadas na auditoria. Sem alterar o que já funciona.

Ao concluir, atualize `debug_log.md` e `TASKS.md`.

---

## Contexto

O sistema de tags já funciona bem para perpétuos. O padrão existente é:
- `comprou:Nome do Produto|offer_code`
- `cancelou:Nome do Produto|offer_code`
- `pendente:Nome do Produto|offer_code`

O problema é que vendas de **lançamentos** não estão gerando a tag do lançamento no contato,
o que quebra a criação de públicos no Meta Ads e a rastreabilidade de leads por lançamento.

---

## Gap 1 — Principal (hotmart-webhook)

**Problema:** o webhook não lê `funnels.launch_tag` ao processar uma venda de lançamento.

**O que implementar:**
No `hotmart-webhook/index.ts`, após identificar o funil via `offer_mappings → funnel_id`:

1. Verificar se `funnels.funnel_type = 'lancamento'`
2. Se sim, buscar `funnels.launch_tag` e `funnels.name`
3. Adicionar a tag `lançamento:NOME_DO_FUNIL|LAUNCH_TAG` ao array `crm_contacts.tags` do comprador
4. Usar o mesmo padrão de upsert de tags que já existe para `comprou:` — não duplicar se a tag já existir

**Exemplo de tag resultante:**
```
lançamento:BF2025|BF2025
```

**Atenção:**
- Só aplicar se `launch_tag` não for NULL
- Não remover tags existentes — apenas adicionar
- Seguir o mesmo padrão de tratamento de erro não-fatal que já existe no webhook
  (falha na tag não deve abortar o processamento da venda)

---

## Gap 2 — Quick win (survey-webhook)

**Problema:** o `survey-webhook` não propaga `launch_tag` para `crm_contact_interactions`.

**O que implementar:**
No `survey-webhook`, ao registrar uma interação de survey:
- Se o survey estiver associado a um funil com `launch_tag`, incluir o `launch_tag` em `crm_contact_interactions`
- Aproximadamente 5 linhas de código conforme identificado na auditoria

---

## Validação

Após implementar:
1. Verificar no banco se um contato que comprou ingresso de lançamento recebeu a tag correta
2. Verificar se a tag aparece na tela de criação de públicos Meta Ads
3. Confirmar que contatos de perpétuos não foram afetados

---

## Deploy e commit

- Deploy do `hotmart-webhook` após o fix
- Deploy do `survey-webhook` se o Gap 2 for implementado
- Commitar as alterações
- Atualizar `debug_log.md` e `TASKS.md`
