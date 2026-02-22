# ANOVA verificação — Funis e Ofertas

Data da verificação: _automática via script local_.

## Escopo

Validação entre:
- `supabase/funnels_utf8.csv`
- `supabase/offer_mappings_full_fixed.csv`

Comando usado:

```bash
python scripts/analyze_funnels_offers.py
```

## Onde o sistema está quebrando

1. **Ofertas apontando para funil inexistente**
   - `87` registros em `offer_mappings_full_fixed.csv` usam `funnel_id = eba8c783-1de2-45b3-b3d7-f0d4f3c03cc2`, mas esse funil não existe em `funnels_utf8.csv`.
   - Impacto: lookup de funil falha em telas/queries que dependem de `offer_mappings.funnel_id` válido.

2. **Duplicidade alta no catálogo de ofertas**
   - `88` grupos duplicados de (`project_id`, `funnel_id`, `nome_produto`, `nome_oferta`).
   - `358` linhas extras (redundantes) além da primeira ocorrência de cada grupo.
   - Impacto: métricas infladas, ambiguidade de mapeamento e maior chance de inconsistência em filtros.

## O que está faltando em funis

1. **Funis sem nenhuma oferta mapeada** (`3`)
   - `8585c1ca-1a26-4a8b-b440-ff502b522b94` — `indefinido`
   - `ad089032-7078-4c18-a93e-c4a49eb8f94e` — `WEB01_MENT_PLANO20K`
   - `f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c` — `Funil Demo`

2. **Cobertura semântica fraca em ofertas**
   - `467` ofertas usam nomes genéricos (`Auto-importado`, `Importado das vendas`, etc.).
   - Impacto: dificulta análise de posição/oferta e leitura operacional dos funis.

## O que está faltando em ofertas (qualidade mínima)

- Campos obrigatórios estão completos (`project_id`, `funnel_id`, `nome_produto`, `nome_oferta` sem vazios), porém faltam **regras de higiene de catálogo**:
  - deduplicação por chave de negócio;
  - tratamento de fallback para não gerar novas linhas repetidas;
  - processo para normalizar nomes genéricos de oferta.

## Próximos passos recomendados (ordem de execução)

1. **Criar/corrigir o funil órfão `eba8c783-...`** ou remapear as 87 ofertas para funis válidos.
2. **Rodar deduplicação controlada** por (`project_id`,`funnel_id`,`nome_produto`,`nome_oferta`) preservando o registro mais antigo.
3. **Criar regra de unicidade lógica** (índice único parcial ou validação de aplicação) para impedir novos duplicados.
4. **Enriquecer nomes genéricos** com convenção de nomenclatura por posição (Front/OB/Upsell/etc.).
5. **Executar esta verificação em CI** para bloquear regressão de catálogo.


## Como aplicar no banco

- Para execução direta em bloco, use `docs/BACKFILL_FUNNEL_ID_TRANSACIONAL.sql`.
- O guia cobre validação de `funnel_type` (`perpetuo`, `lancamento`, `indefinido`) e backfill seguro para `offer_mappings.funnel_id`.
Para executar o backfill de `funnel_id` nas ofertas (passo a passo SQL), veja `docs/COMO_PREENCHER_FUNNEL_ID_OFERTAS.md`.
