# PROMPT — Onda 1: Lançamento Pago (Desbloqueador)

Leia `debug_log.md`, `TASKS.md`, `CLAUDE.md` e `docs/LAUNCH_PHASES_AUDIT.md` antes de começar.
Esta é a Onda 1 do lançamento pago — corrige o que está quebrado antes de construir o novo.
**Somente o que está listado aqui. Nada além.**

Ao finalizar: atualizar `debug_log.md` e `TASKS.md`, commitar todas as migrations.

---

## Tarefa 1 — Migration: colunas ausentes em `launch_phases`

O schema atual do banco está desalinhado com o TypeScript — 5 colunas existem no código
mas não no banco. Toda tentativa de criar uma fase retorna erro 400 do PostgREST.

Criar migration `YYYYMMDDHHMMSS_fix_launch_phases_schema.sql`:

```sql
ALTER TABLE launch_phases
  ADD COLUMN IF NOT EXISTS primary_metric text NOT NULL DEFAULT 'spend',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS phase_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS campaign_name_pattern text;
```

Após aplicar: testar criação de uma fase pelo UI para confirmar que o erro 400 sumiu.

---

## Tarefa 2 — Corrigir `launch_products`

O TypeScript espera `offer_mapping_id`, `product_type`, `lot_name`.
O banco tem `product_name`, `product_code`, `price`, `currency`, `position_type`.

A abordagem correta é **alinhar o banco ao TypeScript** (não o contrário),
pois `offer_mapping_id` como link para uma oferta existente é mais útil
do que duplicar dados em `product_name`/`product_code`.

Criar migration `YYYYMMDDHHMMSS_fix_launch_products_schema.sql`:

```sql
ALTER TABLE launch_products
  ADD COLUMN IF NOT EXISTS offer_mapping_id uuid REFERENCES offer_mappings(id),
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS lot_name text;
```

Manter as colunas antigas (`product_name`, `product_code`, `price`, `currency`, `position_type`)
para não quebrar dados existentes — mesmo que estejam vazias hoje.

---

## Tarefa 3 — Migrar `useLaunchData.ts` de `hotmart_sales` → `funnel_orders_view`

`useLaunchData.ts` ainda queries `hotmart_sales` (tabela depreciada).
A tabela canônica é `funnel_orders_view`. O hook canônico de referência é `useFunnelData.ts`.

- Identificar todas as queries em `useLaunchData.ts` que usam `hotmart_sales`
- Substituir por queries equivalentes em `funnel_orders_view`
- Manter a interface de saída do hook inalterada (não quebrar componentes que consomem)
- Verificar se `CRMRecovery.tsx` também usa `hotmart_sales` — se sim, migrar junto

**Atenção:** não alterar lógica de negócio, apenas a fonte de dados.

---

## Tarefa 4 — Adicionar `registered_at` em `crm_contacts`

Campo que representa quando o lead se cadastrou na landing page — diferente de `created_at`
(quando entrou no Cubo). Sem esse campo, toda análise de "tempo entre cadastro e compra"
fica incorreta em lançamentos com importação de leads.

Criar migration `YYYYMMDDHHMMSS_add_registered_at_crm_contacts.sql`:

```sql
ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS registered_at timestamptz;

COMMENT ON COLUMN crm_contacts.registered_at IS
  'Data real de cadastro do lead na landing page. Diferente de created_at (entrada no Cubo).
   Populado por: webhook de captura, CSV import com coluna de data, ou manualmente.
   NULL = data de cadastro desconhecida.';
```

**Não popular automaticamente** — deixar NULL por padrão.
Quando o CSV import ou webhook de captura tiver a data, ela será preenchida.
Não backfill — dados históricos sem data confiável devem ficar NULL.

---

## Checklist de encerramento

- [ ] 3 migrations criadas e commitadas no git
- [ ] Criação de fase pelo UI funciona sem erro 400
- [ ] `useLaunchData.ts` não referencia mais `hotmart_sales`
- [ ] `CRMRecovery.tsx` verificado (migrar se necessário)
- [ ] `debug_log.md` atualizado com resultado de cada tarefa
- [ ] `TASKS.md` atualizado: mover itens concluídos para ✅
