# PROMPT — Onda 2D: Três Fixes Cirúrgicos

Leia `debug_log.md`, `TASKS.md`, `CLAUDE.md` antes de começar.
Três correções pequenas e independentes. **Nada além do que está aqui.**

Ao finalizar: atualizar `debug_log.md` e `TASKS.md`, commitar tudo.

---

## Fix 1 — `launch_products.product_name` NOT NULL quebrando INSERT

A tabela `launch_products` tem `product_name NOT NULL` (coluna legada da estrutura
original). O frontend não envia esse campo — usa `offer_mapping_id` no lugar.

**Correção:** migration tornando `product_name` nullable.

```sql
ALTER TABLE launch_products
  ALTER COLUMN product_name DROP NOT NULL;
```

Também verificar se `product_code` e `position_type` têm a mesma constraint
e corrigir se necessário.

Testar após aplicar: vincular uma oferta a uma fase deve funcionar sem erro.

---

## Fix 2 — Adicionar tipo de fase "Ingresso" na lista

Na lista de tipos de fase disponíveis (usada em `LaunchPhaseEditor` ou similar),
adicionar o tipo "Ingresso" que ainda não existe.

**Onde adicionar:** no array/enum de `PHASE_TYPES` ou equivalente no código.

```typescript
{
  value: 'captacao_ingresso',
  label: 'Ingresso',
  description: 'Venda de ingressos por lotes',
  metrics: ['cpa', 'passing_diario', 'tx_ob'],
}
```

Posicionar na lista antes de "Captação" — é o tipo principal do lançamento pago.

**Não remover** nenhum tipo existente — apenas adicionar.

---

## Fix 3 — Exibir todos os offer_mappings ativos na aba Produtos

Na aba "Produtos" do `LaunchConfigDialog`, a lista atual mostra apenas ofertas
com `item_type = 'main'` (FRONTs). Isso esconde OBs, upsells e downsells.

**Correção:** exibir todos os `offer_mappings` onde:
- `funnel_id` = funil atual
- `is_active = true`

Sem filtro por `item_type`.

**Na exibição de cada oferta**, mostrar o `item_type` como informação secundária
para o usuário saber o que é cada produto:
- `main` / `FRONT` → badge "Principal"
- `bump` / `OB` → badge "Order Bump"
- `upsell` / `US` → badge "Upsell"
- `downsell` / `DS` → badge "Downsell"
- null → sem badge

O seletor de fase (`phase_id`) e o seletor de classificação já existem —
só mudar o filtro da query para trazer todos os ativos.

---

## Checklist

- [ ] INSERT em `launch_products` funciona sem erro de NOT NULL
- [ ] Tipo "Ingresso" aparece na lista de tipos de fase
- [ ] OBs, upsells e downsells aparecem na aba Produtos
- [ ] Badge de `item_type` visível em cada oferta
- [ ] Build: zero erros
- [ ] Migration commitada
- [ ] `debug_log.md` e `TASKS.md` atualizados
