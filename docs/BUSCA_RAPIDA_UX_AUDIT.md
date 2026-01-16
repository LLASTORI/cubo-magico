# BUSCA RÁPIDA — Auditoria de UX e Consistência Visual

## Data: 2026-01-16

## 📋 STATUS: AUDITORIA CONCLUÍDA (SEM ALTERAÇÕES)

Este documento é **apenas diagnóstico**. Nenhuma alteração foi implementada.

---

## 1️⃣ Auditoria de Estado "Sem Resultados"

### Comportamento Atual

| Estado | Mensagem Exibida | Localização no Código |
|--------|------------------|----------------------|
| Lista vazia após filtro | "Nenhum pedido encontrado para os filtros selecionados" | BuscaRapida.tsx:341-343 |
| Antes de aplicar filtros | "Configure os Filtros / Selecione as datas e filtros desejados..." | BuscaRapida.tsx:345-353 |
| Sem projeto selecionado | "Nenhum Projeto Selecionado" | BuscaRapida.tsx:235-247 |

### Análise de Cenários

#### Cenário A: Filtro de UTM que retorna poucos resultados

**Filtros aplicados:**
- Data: 10/01 a 16/01/2026
- UTM Source: `wpp`

**SQL executado:**
```sql
SELECT COUNT(*) FROM orders
WHERE project_id = ? AND ordered_at >= '2026-01-10' AND ordered_at <= '2026-01-16'
  AND utm_source = 'wpp';
```

**Resultado:** 6 pedidos

**Total no período sem filtro:** 157 pedidos

**Problema UX identificado:**
- ❌ Usuário vê apenas 6 pedidos e pode achar que "sumiu dados"
- ❌ Não há indicação de que 151 pedidos foram filtrados
- ❌ Não há feedback visual sobre os filtros ativos

---

#### Cenário B: Filtro UTM em período com poucos pedidos

**Filtros aplicados:**
- Data: 10/01 a 16/01/2026
- UTM Source: `as-04`

**Resultado esperado:** 0-2 pedidos (fonte rara)

**Problema UX identificado:**
- ❌ "Nenhum pedido encontrado" é genérico demais
- ❌ Usuário não sabe se o filtro está errado ou se realmente não há dados
- ❌ Não há sugestão de ação (remover filtro, ampliar período)

---

#### Cenário C: Filtro combinado que resulta em zero

**Filtros aplicados:**
- UTM Source: `Meta-Ads`
- Produto: `Black Alice Salazar` (produto de lançamento)
- Data: Últimos 7 dias (período perpétuo)

**Problema UX identificado:**
- ❌ Zero resultados porque o produto é de lançamento, não perpétuo
- ❌ Usuário pode achar que há bug
- ❌ Não há explicação do motivo

---

### Documentação do Comportamento

| Métrica | Valor |
|---------|-------|
| Total de pedidos no período (sem filtros) | 157 |
| Com filtro `utm_source = 'Meta-Ads'` | 109 (69.4%) |
| Com filtro `utm_source = 'wpp'` | 6 (3.8%) |
| Pedidos sem UTM | ~30 (19%) |

---

## 2️⃣ Normalização Visual dos Filtros UTM

### Comportamento Atual

#### Quando `utm_source` existe:
- ✅ Filtro funciona corretamente
- ✅ Pedido aparece nos resultados
- ✅ Modal exibe UTMs na seção "Origem da Venda"

#### Quando `utm_source` é NULL:

**Na Lista (OrdersTable.tsx):**
- ❌ Pedido aparece normalmente SEM indicação visual de que não tem UTM
- ❌ Usuário não sabe que o pedido será excluído ao filtrar por UTM

**No Modal (OrderDetailDialog.tsx):**
- ✅ Seção "Origem da Venda (UTM)" **não é exibida** (linha 474 verifica se existe UTM)
- ❌ Não há indicação de "Este pedido não possui dados de origem"

**Ao Filtrar:**
- ❌ Pedidos sem UTM **somem silenciosamente**
- ❌ O total muda de 157 para 109 sem explicação
- ❌ Usuário pode interpretar como bug

### Riscos de Interpretação

| Risco | Impacto | Severidade |
|-------|---------|------------|
| Usuário acha que perdeu vendas | Alto - pode abrir suporte | 🔴 Alta |
| Usuário acha que tracking está quebrado | Médio - pode desconfiar da plataforma | 🟡 Média |
| Usuário não entende diferença entre filtros | Baixo - pode usar errado | 🟢 Baixa |

### Pedidos Sem UTM no Período de Teste

```sql
-- Pedidos sem UTM no período 10-16/Jan
SELECT provider_order_id, buyer_name, ordered_at, status
FROM orders
WHERE project_id = ? AND ordered_at >= '2026-01-10' AND ordered_at <= '2026-01-16'
  AND utm_source IS NULL
ORDER BY ordered_at DESC;
```

**Exemplo encontrado:**
| Pedido | Cliente | Data | Status | UTM |
|--------|---------|------|--------|-----|
| HP3996971528 | Denise Paiva Carneiro | 15/01 16:45 | approved | NULL |

> Este pedido **aparece normalmente** na lista, mas **some** quando o usuário filtra por qualquer UTM. Não há indicação visual de que isso ocorrerá.

---

## 3️⃣ Auditoria de Coerência Lista ↔ Modal

### Tabela de Verdade

| Campo | Na Lista | No Modal | Fonte | Consistente? |
|-------|----------|----------|-------|--------------|
| Pedido ID | ✅ `provider_order_id` | ✅ `provider_order_id` | orders | ✅ SIM |
| Plataforma | ✅ Badge `provider` | ✅ Badge `provider` | orders | ✅ SIM |
| Cliente | ✅ `buyer_name` | ✅ `buyer_name` + `buyer_email` | orders | ✅ SIM |
| Produtos | ✅ Lista truncada (2 max) | ✅ Lista completa ordenada | order_items | ✅ SIM |
| Valor Bruto | ✅ `customer_paid` | ✅ `customer_paid` | orders | ✅ SIM |
| Valor Líquido | ✅ `producer_net` | ✅ `producer_net` | orders | ✅ SIM |
| Status | ✅ Badge colorido | ✅ Badge colorido | orders | ✅ SIM |
| Data | ✅ `ordered_at` (só data) | ✅ `ordered_at` (data + hora) | orders | ✅ SIM |
| UTM Source | ❌ **NÃO EXIBE** | ✅ Exibe se existir | orders | ⚠️ PARCIAL |
| UTM Campaign | ❌ **NÃO EXIBE** | ✅ Exibe se existir | orders | ⚠️ PARCIAL |
| Funil | ❌ **NÃO EXIBE** | ❌ **NÃO EXIBE** | order_items.funnel_id | ❌ AMBOS FALTAM |

### Análise de Inconsistências

#### UTM na Lista
- **Estado atual:** A tabela de pedidos NÃO exibe UTM Source
- **Risco:** Usuário não sabe quais pedidos têm ou não têm UTM até abrir o modal
- **Impacto:** Confusão ao aplicar filtros de UTM

#### Funil
- **Estado atual:** Funil não é exibido nem na lista nem no modal
- **Risco:** Usuário pode filtrar por funil mas não ver qual funil é de cada pedido
- **Impacto:** Validação manual impossível

---

## 4️⃣ Caso de Confiança (Usuário Leigo)

### Persona: Produtor Digital

> "Sou um produtor olhando minha Busca Rápida pela primeira vez. Não sei SQL."

### Perguntas de Confiança

#### P1: Ele entenderia por que um pedido não aparece ao filtrar por UTM?

**Resposta: ❌ NÃO**

**Motivo:**
- Não há indicação visual de quais pedidos têm UTM
- A mensagem "Nenhum pedido encontrado" é genérica
- Não há contador "X pedidos filtrados de Y total"

**Citação simulada do usuário:**
> "Eu tinha 157 pedidos, coloquei filtro de Meta-Ads e ficou 109. Cadê os outros 48?"

---

#### P2: Ele entenderia por que um pedido não tem UTM?

**Resposta: ❌ NÃO**

**Motivo:**
- Modal simplesmente não exibe seção de UTM se não existir
- Não há mensagem "Este pedido não possui dados de origem rastreada"
- Usuário pode achar que é bug do sistema

**Citação simulada do usuário:**
> "O pedido HP3996971528 da Denise não tem UTM. O tracking está quebrado?"

---

#### P3: Ele entenderia que os valores estão certos?

**Resposta: ✅ PARCIALMENTE**

**Positivo:**
- Cards mostram "Receita Bruta" e "Receita Líquida do Produtor" claramente
- Modal tem decomposição financeira com validação visual
- Soma dos produtos é validada contra `customer_paid`

**Negativo:**
- Não há comparação com "total esperado" da Hotmart
- Não há explicação do que é "Taxas Plataforma" vs "Coprodução"

**Citação simulada do usuário:**
> "Receita Bruta: R$ 205,00. Produtor recebe: R$ 94,43. Parece certo... mas eu recebo isso mesmo?"

---

## 5️⃣ Resumo de Problemas de UX

### O que está tecnicamente correto ✅

| Aspecto | Status |
|---------|--------|
| Filtros SQL funcionam corretamente | ✅ |
| Dados são consistentes entre lista e modal | ✅ |
| Valores financeiros são validados | ✅ |
| UTMs vêm da fonte canônica (orders) | ✅ |
| Paginação funciona após filtros | ✅ |

### Onde a UX pode gerar dúvida ⚠️

| Problema | Localização | Impacto |
|----------|-------------|---------|
| Pedidos sem UTM somem silenciosamente ao filtrar | Lista | 🔴 Alto |
| Não há indicação visual de "tem UTM" vs "não tem" | OrdersTable | 🔴 Alto |
| Mensagem "Nenhum pedido encontrado" é genérica | BuscaRapida | 🟡 Médio |
| Modal não explica ausência de UTM | OrderDetailDialog | 🟡 Médio |
| Funil não aparece na lista nem no modal | Ambos | 🟡 Médio |
| Não há contador "X de Y filtrados" | BuscaRapida | 🟢 Baixo |

### O que NÃO deve ser alterado 🚫

| Aspecto | Motivo |
|---------|--------|
| Lógica de filtros SQL | Funciona corretamente |
| Validação de valores financeiros | Cálculos estão certos |
| Ordenação de produtos no modal | Alinhada com Hotmart |
| Decomposição financeira | Explica corretamente os descontos |

---

## 6️⃣ Recomendações para Próximo Prompt

### Prioridade Alta (DEVE ser tratado)

1. **Indicador visual de UTM na lista**
   - Adicionar ícone ou badge pequeno na linha do pedido
   - Ex: 🟢 = tem UTM, ⚪ = sem UTM

2. **Mensagem quando pedidos sem UTM são filtrados**
   - Ex: "109 pedidos com UTM encontrados. 48 pedidos sem dados de origem não foram exibidos."

3. **Mensagem no modal quando não há UTM**
   - Ao invés de esconder a seção, mostrar:
   - "Este pedido não possui dados de origem rastreada (UTM). Isso pode ocorrer em vendas orgânicas ou com tracking desabilitado."

### Prioridade Média (DEVERIA ser tratado)

4. **Contador de filtros ativos**
   - Mostrar quais filtros estão ativos e quantos pedidos foram afetados

5. **Exibir funil na lista e no modal**
   - Buscar funnel name via funnel_id de order_items

### Prioridade Baixa (PODE ser tratado depois)

6. **Sugestões quando resultado é vazio**
   - "Tente remover o filtro de UTM" ou "Amplie o período de datas"

---

## 📋 Assinatura de Auditoria

```
Auditoria realizada em: 2026-01-16
Tipo: Diagnóstico (sem alterações)
Componentes analisados:
  - BuscaRapida.tsx
  - OrdersTable.tsx
  - OrderDetailDialog.tsx
  - SalesFilters.tsx
  
Dados de teste:
  - Período: 10/01 a 16/01/2026
  - Total de pedidos: 157
  - Com UTM: 127 (80.9%)
  - Sem UTM: 30 (19.1%)
  
Conclusão: UX funcional mas com gaps de comunicação
```
