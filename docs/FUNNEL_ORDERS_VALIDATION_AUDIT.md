# Auditoria de consistência — FUNNEL ORDERS VALIDATION

Escopo: validar o conteúdo de `docs/FUNNEL_ORDERS_VALIDATION.md` contra código/migrations do repositório (sem consulta runtime ao banco remoto).

## Resultado rápido

- ✅ **Migração de fonte no FunnelAnalysis**: confirmada para `funnel_orders_view` via `useFunnelData`.
- ✅ **Views `funnel_orders_view` e `funnel_orders_by_offer`**: existem em migrations.
- ⚠️ **Filtro de status**: o documento sugere regra antiga (approved/completed), mas a versão atual aplica filtro no hook com `['approved','complete','partial_refund']` e a view está sem `WHERE` hardcoded.
- ⚠️ **Números da Juliane e totais do projeto**: não verificáveis só por código local; exigem query no banco alvo.

## Checagens objetivas

### 1) FunnelAnalysis usa Orders Core

Confirmado:
- `src/pages/FunnelAnalysis.tsx` documenta “Sales: funnel_orders_view (Orders Core)”.
- `src/hooks/useFunnelData.ts` consulta `.from('funnel_orders_view')`.

### 2) Views canônicas existem

Confirmado em migrations:
- `funnel_orders_view` criada na migração de 2026-01-16.
- `funnel_orders_by_offer` criada na mesma migração.

### 3) Regra de status mudou (ponto de atenção)

Diferença encontrada:
- A migração inicial de `funnel_orders_view` tinha `WHERE status IN (...)`.
- Migração posterior removeu `WHERE` da view e moveu filtro para aplicação.
- Hook atual aplica: `approved`, `complete`, `partial_refund`.

Implicação: qualquer texto que diga que a view sozinha filtra status está desatualizado.

### 4) Caso Juliane (HP3609747213C1)

- O caso existe documentado em mais de um arquivo de docs.
- Porém os valores numéricos (`customer_paid`, `producer_net`, `order_items_count`, `has_bump`) não podem ser revalidados localmente sem acesso ao banco/projeto.

### 5) Proibições de fonte para FunnelAnalysis

- No hook `useFunnelData`, as proibições para FunnelAnalysis estão explícitas (não usar `finance_tracking_view`, `hotmart_sales`, `sales_core_*`).
- Ainda existem outros módulos do sistema que usam `finance_tracking_view` (fora do escopo exclusivo do FunnelAnalysis).

## O que pedir/validar no Lovable (antigo/intacto)

1. **Snapshot da query da Juliane** em `funnel_orders_view` para `transaction_id='HP3609747213C1'`.
2. **Conferência de item_type** dos 3 itens do pedido (esperado problema de backfill: `bump` vs `main/orderbump`).
3. **Totais do projeto de teste** (orders, customer_paid, producer_net, items, bumps, upsells) com range de data explícito.
4. **Confirmação de status incluídos** no consumidor atual (`approved`, `complete`, `partial_refund`).

## Conclusão

A migração para Orders Core no FunnelAnalysis está implementada no código. As pendências são de **validação runtime de dados** e de **alinhamento de documentação de status** com a implementação atual.
