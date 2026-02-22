# Runbook — Correção de Funis não aparecendo

## Quando usar
Use este runbook quando:
- a tabela `offer_mappings` possui dados (`id_funil`) para o projeto;
- a tabela `funnels` está vazia para esse mesmo projeto;
- a tela de Funis no app retorna vazia.

## Pré-checagem
```sql
select id, project_id, id_funil, funnel_id
from public.offer_mappings
where project_id = '<PROJECT_UUID>'
limit 20;

select id, name, project_id
from public.funnels
where project_id = '<PROJECT_UUID>'
order by name;
```

## Aplicar hotfix
Execute o arquivo:
- `public/migration_fix_funnels.sql`


## Cenário B (quando id_funil está quase todo "A Definir")
Se os dados legados não carregam nomes reais de funil em `offer_mappings.id_funil`, use:
- `public/migration_restore_funnels_from_catalog.sql`

Esse script restaura os funis por um catálogo conhecido (com IDs estáveis) e depois tenta
backfill do `offer_mappings.funnel_id` apenas em casos de nome unívoco.

## Validação pós-hotfix
```sql
-- 1) Não deve sobrar mapping sem funnel_id
select count(*) as sem_funnel_uuid
from public.offer_mappings
where project_id = '<PROJECT_UUID>'
  and funnel_id is null;

-- 2) Funis devem existir
select id, name
from public.funnels
where project_id = '<PROJECT_UUID>'
order by name;

-- 3) Join legado->novo deve fechar
select om.id_funil, f.name, count(*)
from public.offer_mappings om
left join public.funnels f
  on f.id = om.funnel_id
where om.project_id = '<PROJECT_UUID>'
group by 1,2
order by 3 desc;
```

## Observação importante de RLS
A leitura de funis depende de membership em `project_members` para o usuário autenticado.
Se a tela continuar vazia mesmo com dados, valide o membership do usuário no projeto.
