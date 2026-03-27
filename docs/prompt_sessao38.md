# Sessão 38 — Bugs: data desatualizada + ingressos inconsistentes

## BUG 1 — Data de início desatualizada na tela

**Sintoma:** edição editada de 23/03 → 24/03. Banco correto. Tela ainda mostra 23/03.

**Investigar:**
- `LaunchEditionAnalysis` busca `start_date` de forma reativa ou valor fixo no mount?
- Subqueries de `funnel_orders_view`, `meta_insights` e `PassingDiarioChart` usam a data como variável reativa ou estado local fixo?

**Fix:**
- `start_date`/`end_date` devem vir SEMPRE da query reativa de `launch_editions`
- Subqueries derivadas reativamente dessas datas (dependências corretas no useMemo/useEffect)
- Invalidar cache ao salvar edição: `queryClient.invalidateQueries(['launch-edition', editionId])`

---

## BUG 2 — Três números diferentes para "ingressos" na mesma tela

**Sintoma:**
- KPI topo → 28
- Detalhamento por Produto (Lote1) → 50
- Formas de Pagamento → 24

**Suspeitas:**
- 50 → usando período do funil inteiro, não da edição
- 24 → contando `order_items` em vez de `orders` únicos

**Fonte canônica para todos os blocos:**
```sql
SELECT * FROM funnel_orders_view
WHERE project_id = [project_id]
  AND funnel_id = [funnel_id]
  AND economic_day BETWEEN edition.start_date AND edition.end_date
  AND status = 'approved'
```
Ingressos = `COUNT(DISTINCT order_id)` nesse conjunto.

**Fix:**
- `editionSalesData` já existe em `LaunchEditionAnalysis.tsx` (Onda 2E)
- Confirmar que `PaymentMethodAnalysis`, bloco de Detalhamento e KPI topo recebem o mesmo `editionSalesData` como prop
- Eliminar qualquer query paralela com período diferente nos blocos filhos
- Variações legítimas (ex: "produtos" vs "pedidos") devem estar explícitas na UI

---

## Validação

Após os dois fixes: edição Abril_26 deve mostrar a mesma data e o mesmo número base de ingressos nos três blocos.

`npm run build` — zero erros.
