# Como preencher `funnel_id` nas ofertas (quando inserir funis não resolve)

## Por que seu SQL de `INSERT INTO funnels` não preencheu `offer_mappings.funnel_id`

Inserir/atualizar registros em `funnels` **não** atualiza automaticamente `offer_mappings`.
Hoje o vínculo é por FK (`offer_mappings.funnel_id -> funnels.id`) e precisa de `UPDATE` explícito nas ofertas.

Em outras palavras:
1. Você criou os funis corretamente.
2. Mas as linhas da `offer_mappings` continuam com `funnel_id` antigo/NULL até rodar backfill.


## Passo 0 — Confirmar estrutura de classificação (`funnel_type`)

Pelo que você trouxe do Lovable, os tipos válidos são:
- `perpetuo`
- `lancamento`
- `indefinido`

Valide no banco:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'funnels'
  AND column_name IN ('funnel_type', 'campaign_name_pattern', 'launch_tag');

SELECT funnel_type, COUNT(*)
FROM public.funnels
GROUP BY funnel_type
ORDER BY COUNT(*) DESC;
```

Se o `INSERT ... ON CONFLICT` dos funis rodou com sucesso, isso resolve **somente** `public.funnels`.
O preenchimento de `offer_mappings.funnel_id` continua sendo um passo separado (backfill).

## Passo 1 — Diagnóstico rápido (rode no SQL Editor)

```sql
-- 1) ofertas com funnel_id inválido (aponta para funil inexistente)
SELECT om.project_id, om.funnel_id, COUNT(*)
FROM public.offer_mappings om
LEFT JOIN public.funnels f ON f.id = om.funnel_id
WHERE om.funnel_id IS NOT NULL
  AND f.id IS NULL
GROUP BY om.project_id, om.funnel_id
ORDER BY COUNT(*) DESC;

-- 2) ofertas sem funnel_id
SELECT project_id, COUNT(*)
FROM public.offer_mappings
WHERE funnel_id IS NULL
GROUP BY project_id
ORDER BY COUNT(*) DESC;
```

## Passo 2 — Corrigir o caso que você relatou (`eba8c783-...`)

Se o funil já existe no banco (como no seu SQL), rode:

```sql
-- garante que o funil existe
SELECT id, project_id, name
FROM public.funnels
WHERE id = 'eba8c783-1de2-45b3-b3d7-f0d4f3c03cc2';

-- remapeia as ofertas desse projeto para o funil correto
UPDATE public.offer_mappings
SET funnel_id = 'eba8c783-1de2-45b3-b3d7-f0d4f3c03cc2'::uuid,
    updated_at = now()
WHERE project_id = '7f44b177-5255-4393-a648-3f0dfc681be9'::uuid
  AND (funnel_id IS NULL OR funnel_id = 'eba8c783-1de2-45b3-b3d7-f0d4f3c03cc2'::uuid);
```

> Observação: se o `UPDATE` acima retornar 0 linhas, então o problema pode ser outro `funnel_id` ou outro `project_id` nas ofertas.

## Passo 3 — Backfill geral por nome legado (`id_funil` -> `funnels.name`)

Quando existir `id_funil` textual legado na oferta:

```sql
UPDATE public.offer_mappings om
SET funnel_id = f.id,
    updated_at = now()
FROM public.funnels f
WHERE om.project_id = f.project_id
  AND om.funnel_id IS NULL
  AND om.id_funil IS NOT NULL
  AND btrim(lower(om.id_funil)) = btrim(lower(f.name));
```


## Passo 3.1 — Corrigir ofertas com `funnel_id` inválido (quando o funil correto já existe)

Esse cenário é exatamente o que seu relatório mostrou (`funnel_id` apontando para ID que não está visível no conjunto atual).

```sql
-- exemplo: força reassociação para o funil correto do projeto
UPDATE public.offer_mappings om
SET funnel_id = f.id,
    updated_at = now()
FROM public.funnels f
WHERE om.project_id = '7f44b177-5255-4393-a648-3f0dfc681be9'::uuid
  AND f.project_id = om.project_id
  AND f.id = 'eba8c783-1de2-45b3-b3d7-f0d4f3c03cc2'::uuid
  AND (
    om.funnel_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.funnels fx WHERE fx.id = om.funnel_id
    )
  );
```

> Esse padrão evita linhas órfãs: se o `funnel_id` atual não existe em `funnels`, ele substitui pelo funil válido do mesmo projeto.

## Passo 4 — Validar se funcionou

```sql
-- não deve retornar linhas
SELECT om.id, om.project_id, om.funnel_id
FROM public.offer_mappings om
LEFT JOIN public.funnels f ON f.id = om.funnel_id
WHERE om.funnel_id IS NOT NULL
  AND f.id IS NULL
LIMIT 50;

-- cobertura de funnel_id por projeto
SELECT project_id,
       COUNT(*) AS total_offers,
       COUNT(funnel_id) AS offers_com_funnel,
       COUNT(*) - COUNT(funnel_id) AS offers_sem_funnel
FROM public.offer_mappings
GROUP BY project_id
ORDER BY offers_sem_funnel DESC, total_offers DESC;
```

## Script único (transacional)

Se preferir rodar tudo em bloco (com snapshot pré/pós e validação), use:

- `docs/BACKFILL_FUNNEL_ID_TRANSACIONAL.sql`

Esse arquivo já inclui:
- validação de `funnel_type`;
- backfill legado por `id_funil`;
- correção específica do projeto `7f44b177-5255-4393-a648-3f0dfc681be9`;
- checagens de delta e inválidos ao final.

## Passo 5 (opcional, recomendado) — proteger contra regressão

- Criar rotina recorrente (job) que rode backfill por `id_funil`/`codigo_oferta`.
- Exibir alerta no app quando oferta nova chegar sem `funnel_id`.
- Manter script `python scripts/analyze_funnels_offers.py` na CI para barrar novo lote inconsistente.
