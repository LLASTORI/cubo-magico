# Spec: Importação Histórica CSV de Providers — Cubo Mágico

**Data:** 2026-03-14
**Status:** Aprovado para implementação
**Autor:** Claude Code + Leandro Lastori

---

## 1. Contexto e Motivação

O Cubo Mágico possui três pontos de integração com a Hotmart (e futuros providers):

1. **Webhook** — fonte única da verdade para vendas em tempo real. Garante 100% dos dados atuais.
2. **API** — importação e atualização de ofertas em `offer_mappings`.
3. **CSV** — importação do histórico passado. Quando uma conta nova chega ao Cubo, não há dados históricos no banco. O CSV preenche esse vácuo.

**Problema atual:** o fluxo de importação CSV existente foi construído para um formato antigo de CSV da Hotmart e não funciona com o formato atual ("Modelo Detalhado", delimitador `;`, colunas renomeadas e com campos críticos como `Transação do Produto Principal` e `Venda feita como`).

**Solução:** construir um novo fluxo completo, provider-agnostic desde o início, preparado para Hotmart agora e outros providers no futuro.

---

## 2. Princípios Invioláveis

1. **Webhook sempre prevalece.** Se um order já tem `ledger_events` com `source_origin = 'webhook'`, o CSV não toca em nada financeiro.
2. **Nunca fabricar valores.** Só registrar o que veio explicitamente no CSV.
3. **Idempotência total.** Rodar o mesmo CSV duas vezes não cria duplicatas. Como o índice único de `ledger_events.provider_event_id` foi removido do banco, a responsabilidade de deduplicação é 100% do código (SELECT antes de INSERT).
4. **Contatos: complementar, nunca sobrescrever.** Dados mais ricos que já estão no CRM não são apagados pelo CSV.
5. **Source rastreável.** Todo dado vindo do CSV é marcado com `source_origin = 'csv'`.

---

## 3. Arquitetura

### 3.1 Estrutura de arquivos

```
supabase/functions/
  provider-csv-import/
    index.ts                  ← roteador principal (recebe provider + rows)
    providers/
      hotmart.ts              ← parser e mapper Hotmart
      (kiwify.ts)             ← futuro
      (eduzz.ts)              ← futuro
    core/
      order-writer.ts         ← escreve orders + order_items (genérico)
      ledger-writer.ts        ← escreve ledger_events (genérico)
      contact-writer.ts       ← cria/vincula contatos no CRM (genérico)
      dedup-checker.ts        ← verifica duplicatas antes de escrever

src/components/settings/
  ProviderCSVImport.tsx       ← componente React com seletor de provider
  providers/
    HotmartCSVParser.ts       ← parse + normalização do CSV Hotmart no browser
```

### 3.2 Tipos centrais

```typescript
// Shape enviado pelo browser para a edge function
interface NormalizedOrderGroup {
  provider_order_id: string;         // Transação do pai (ou própria se principal)
  own_transaction_id: string;        // Transação da linha original
  status: 'approved' | 'completed' | 'cancelled' | 'refunded' | 'pending' | 'skip';
  ordered_at: string;                // ISO 8601
  approved_at: string | null;        // ISO 8601
  currency: string;                  // Moeda original de compra (ex: 'BRL', 'USD')
  customer_paid: number;             // Soma de todos os itens do grupo, na moeda original
  raw_sck: string | null;
  payment_method: string | null;
  payment_type: string | null;
  installments: number;
  buyer_name: string | null;
  buyer_email: string | null;        // Chave de deduplicação do contato
  buyer_phone: string | null;
  buyer_document: string | null;
  buyer_instagram: string | null;
  buyer_country: string | null;
  items: NormalizedOrderItem[];
}

interface NormalizedOrderItem {
  own_transaction_id: string;        // Transação da linha (para ledger_event IDs)
  provider_product_id: string;
  provider_offer_id: string | null;
  product_name: string;
  offer_name: string | null;
  item_type: 'main' | 'bump' | 'upsell' | 'downsell' | 'subscription_renewal';
  base_price: number;                // Valor de compra sem impostos, moeda original
  quantity: number;
  // Financeiro para ledger
  producer_net_brl: number;
  platform_fee_brl: number;
  affiliate_brl: number;
  coproducer_brl: number;
  conversion_rate: number;           // 1.0 para BRL nativo
  is_debit: boolean;                 // true para cancelado/reembolsado
}

// Interface que todo provider deve implementar
interface ProviderMapper {
  /**
   * Detecta se um arquivo CSV é deste provider.
   * Verifica colunas obrigatórias no header.
   */
  detect(headers: string[]): boolean;

  /**
   * Parseia uma linha bruta do CSV em um objeto intermediário.
   * Normaliza números (formato BR), datas e strings.
   */
  parseRow(raw: Record<string, string>): ParsedRow | null;

  /**
   * Agrupa linhas parseadas em NormalizedOrderGroup[].
   * Resolve agrupamento de bumps, upsells e recorrências.
   */
  groupRows(rows: ParsedRow[]): NormalizedOrderGroup[];
}
```

### 3.3 Fluxo de dados

```
[Browser]
  1. Usuário seleciona provider (Hotmart) e faz upload do CSV
  2. HotmartCSVParser.ts faz parse local:
     - Detecta delimitador (;)
     - Normaliza números BR (1.234,56 → 1234.56)
     - Normaliza datas (DD/MM/YYYY HH:MM:SS → ISO)
     - Filtra linhas com status Expirado/Recusado (status = 'skip')
     - Agrupa bumps sob pedido pai (Transação do Produto Principal)
     - Identifica recorrências (item_type = 'subscription_renewal')
  3. Mostra preview (primeiras 20 linhas) + totais antes de confirmar
  4. Chunking: envia em lotes de 200 grupos para evitar timeout da edge function

[Edge Function: provider-csv-import]
  5. Recebe: { provider: 'hotmart', project_id, groups: NormalizedOrderGroup[] }
  6. Para cada grupo:
     a. contact-writer: cria ou complementa contato no CRM
     b. dedup-checker: verifica estado do order no banco
     c. order-writer: cria ou ignora o order
     d. order-writer: upsert dos order_items
     e. ledger-writer: cria ledger_events se necessário
  7. Retorna resultado agregado do lote
```

---

## 4. Lógica de Deduplicação (Camadas de Segurança)

> **Importante:** O índice único `idx_ledger_events_provider_event_id_unique` foi removido
> na migration `20260303234736`. A deduplicação de `ledger_events` é feita por código
> (SELECT antes de INSERT), não por constraint de banco.

| Camada | Mecanismo | O que protege |
|--------|-----------|---------------|
| 1 | `UNIQUE (project_id, provider, provider_order_id)` no banco | Impede orders duplicados |
| 2 | SELECT em `ledger_events` filtrando `source_origin = 'webhook'` antes de criar qualquer evento CSV | Garante que webhook nunca é sobrescrito |
| 3 | SELECT em `ledger_events` por `provider_event_id` antes de cada INSERT | Impede ledger_events duplicados (sem constraint de banco) |
| 4 | Upsert de `order_items` por `(order_id, provider_product_id, provider_offer_id)` | Impede itens duplicados |
| 5 | Upsert de `crm_contacts` por `(project_id, email)` com complemento de campos | Complementa sem sobrescrever |

### Decisão por estado do order

| Situação encontrada | Ação |
|--------------------|------|
| Order não existe | Cria order + items + ledger + contato |
| Order existe, sem ledger | Complementa: cria ledger + vincula contato |
| Order existe, ledger de webhook | Ignora financeiro; atualiza contato se necessário |
| Order existe, ledger de CSV | Ignora (já importado antes — idempotente) |

---

## 5. Mapeamento de Colunas — Hotmart Modelo Detalhado (formato atual)

> Delimitador: `;` | Encoding: UTF-8 BOM | Datas: `DD/MM/YYYY HH:MM:SS`

| Coluna CSV | Campo destino | Observação |
|------------|--------------|------------|
| `Código da transação` | transaction ID própria | Base para idempotência |
| `Transação do Produto Principal` | `orders.provider_order_id` | Usado quando é bump/upsell/renewal |
| `Venda feita como` | `order_items.item_type` | Ver seção 6 |
| `Tipo de cobrança` | `order_items.item_type` | Complementa para detectar renewals |
| `Status da transação` | `orders.status` | Ver seção 7 |
| `Data da transação` | `orders.ordered_at` | Normalizar para ISO |
| `Confirmação do pagamento` | `orders.approved_at` | Normalizar para ISO |
| `Código do produto` | `order_items.provider_product_id` | |
| `Produto` | `order_items.product_name` | |
| `Código do preço` | `order_items.provider_offer_id` | |
| `Nome deste preço` | `order_items.offer_name` | |
| `Valor de compra com impostos` | `orders.customer_paid` | Moeda original (não converter) |
| `Moeda de compra` | `orders.currency` | Armazena moeda original do comprador |
| `Taxa de conversão (moeda de recebimento)` | `ledger_events.conversion_rate` | 1.0 se BRL nativo |
| `Faturamento líquido do(a) Produtor(a)` | `ledger_events.amount_brl` (event_type: `sale`) | Já em BRL |
| `Taxa de processamento` | `ledger_events.amount_brl` (event_type: `platform_fee`) | Já em BRL |
| `Comissão do(a) Afiliado(a)` | `ledger_events.amount_brl` (event_type: `affiliate`) | Só se > 0 |
| `Faturamento do(a) Coprodutor(a)` | `ledger_events.amount_brl` (event_type: `coproducer`) | Só se > 0 |
| `Método de pagamento` | `orders.payment_method` | Normalizar |
| `Tipo de cobrança` | `orders.payment_type` | |
| `Quantidade total de parcelas` | `orders.installments` | |
| `Código SCK` | `orders.raw_sck` | Parse de UTMs idêntico ao webhook |
| `Comprador(a)` | `crm_contacts.name` + `orders.buyer_name` | |
| `Email do(a) Comprador(a)` | `crm_contacts.email` + `orders.buyer_email` | Chave do contato |
| `Telefone` | `crm_contacts.phone` | |
| `Documento` | `crm_contacts.document` | CPF/CNPJ |
| `Instagram` | `crm_contacts.instagram` | |
| `País` | `crm_contacts.country` | |

> **Moeda em orders:** `orders.currency` armazena a moeda original de compra (ex: 'USD').
> `orders.customer_paid` armazena o valor nessa moeda original.
> Os valores BRL reais ficam em `ledger_events.amount_brl`.
> Nunca colocar valor convertido em `customer_paid` quando a moeda é estrangeira.

---

## 6. Agrupamento: Bumps, Upsells e Recorrências

### Regra de agrupamento (executada no browser antes de enviar)

```
Para cada linha:

  SE "Transação do Produto Principal" está preenchido e ≠ "(none)":
    → provider_order_id = Transação do Produto Principal
    → item_type = derivado de "Venda feita como" + "Tipo de cobrança"

  SENÃO:
    → provider_order_id = Código da transação (próprio)
    → item_type = 'main' (ou 'subscription_renewal' se for renovação)
```

### Mapeamento: `Venda feita como` + `Tipo de cobrança` → `item_type`

| Venda feita como | Tipo de cobrança | item_type |
|---|---|---|
| `Produto principal` | `Único` / `1a cobrança` / vazio | `main` |
| `Produto principal` | `2a cobrança`, `3a cobrança`... | `subscription_renewal` |
| `Produto order bump` | qualquer | `bump` |
| `Oferta de upgrade` | qualquer | `upsell` |
| `Oferta de downgrade` | qualquer | `downsell` |
| qualquer outro | qualquer | `main` (fallback seguro) |

### Comportamento para recorrências de assinatura

Renovações de assinatura (C2, C3...) **sempre formam pedidos independentes**.

- `Tipo de cobrança = "2a cobrança"` → pedido próprio com `provider_order_id = Código da transação`
- `item_type = 'subscription_renewal'`
- Se `Transação do Produto Principal` estiver preenchida em uma renovação (Hotmart às vezes preenche), **ignorar** e usar o próprio `Código da transação` como `provider_order_id`

Isso garante que cada cobrança recorrente apareça como evento financeiro próprio no ledger, sem ser agrupada ao pedido original.

### customer_paid com múltiplos itens

O `customer_paid` do order = soma dos `Valor de compra com impostos` de todos os itens do grupo.
Todos os itens de um mesmo grupo devem ter a mesma moeda; se houver divergência (edge case raro), registrar erro e não importar o grupo.

---

## 7. Status → Ação

| Status CSV | Ação | `orders.status` | `orders.ledger_status` |
|---|---|---|---|
| `Aprovado` | Cria order + ledger crédito | `approved` | `complete` |
| `Completo` | Cria order + ledger crédito | `completed` | `complete` |
| `Cancelado` | Cria order + ledger crédito + débito | `cancelled` | `complete` |
| `Reembolsado` | Cria order + ledger crédito + débito | `refunded` | `complete` |
| `Aguardando pagamento` | Cria order sem ledger | `pending` | `pending` |
| `Expirado` | Ignora linha inteiramente | — | — |
| `Recusado` | Ignora linha inteiramente | — | — |

> Para Cancelado/Reembolsado: o CSV representa histórico já resolvido.
> Criamos o crédito (venda) e o débito (cancelamento) — o balanço final é correto.

---

## 8. Ledger Events gerados pelo CSV

Todos os eventos recebem:
- `source_origin = 'csv'`
- `confidence_level = 'accounting'`
- `provider_event_id = csv_<tipo>_<own_transaction_id>` (único por transação + tipo)

Antes de cada INSERT: SELECT por `provider_event_id` — se existir, pular (idempotência manual).

Para um pedido **Aprovado**:
```
csv_sale_HP3092397484          → event_type: 'sale',         actor: 'PRODUCER'     (sempre)
csv_platform_fee_HP3092397484  → event_type: 'platform_fee', actor: 'MARKETPLACE'  (sempre)
csv_affiliate_HP3092397484     → event_type: 'affiliate',    actor: 'AFFILIATE'    (se > 0)
csv_coproducer_HP3092397484    → event_type: 'coproducer',   actor: 'CO_PRODUCER'  (se > 0)
```

Para **Cancelado/Reembolsado** — dois conjuntos de eventos: crédito (venda original) + débito (estorno):
```
csv_sale_HP3092397484              → event_type: 'sale',         amount_brl positivo (crédito)
csv_platform_fee_HP3092397484      → event_type: 'platform_fee', amount_brl positivo (crédito)
csv_refund_HP3092397484            → event_type: 'refund',       amount_brl negativo (débito)
csv_platform_fee_refund_HP3092397484 → event_type: 'platform_fee', amount_brl negativo (débito)
```

> IDs de crédito e débito DEVEM ser distintos para que o SELECT-before-INSERT não suprima
> o evento de débito ao encontrar o crédito com o mesmo ID. A convenção é:
> - Crédito: `csv_<tipo>_<transaction_id>`
> - Débito:  `csv_<tipo>_refund_<transaction_id>`

> O vocabulário de `event_type` segue o mesmo padrão do webhook (`hotmart-webhook/index.ts`):
> `sale`, `platform_fee`, `affiliate`, `coproducer`, `refund`.

---

## 9. Contatos (CRM)

### Regra de criação/atualização

```
Busca crm_contacts por (project_id, email):

  SE email ausente no CSV:
    → Cria order normalmente com contact_id = NULL
    → Registra no resultado: "importado sem vínculo CRM (email ausente)"
    → NÃO descarta o pedido — dados financeiros ainda são válidos

  SE contato existe:
    → Complementa apenas campos que estão NULL no banco
    → Nunca sobrescreve campos preenchidos
    → Vincula contact_id ao order

  SE contato não existe:
    → INSERT com: name, email, phone, document, instagram, country
    → Vincula contact_id ao order
```

### Campos do contato (ordem de complemento)

| Campo `crm_contacts` | Fonte CSV |
|---|---|
| `name` | `Comprador(a)` |
| `email` | `Email do(a) Comprador(a)` |
| `phone` | `Telefone` |
| `document` | `Documento` |
| `instagram` | `Instagram` |
| `country` | `País` |

---

## 10. Resultado da Importação

O componente exibe ao final:

```
✅ N pedidos criados do zero
🔄 N pedidos complementados com ledger (existiam sem financeiro)
⏭️  N pedidos ignorados (webhook já processou)
👤 N contatos criados / N contatos atualizados
⚠️  N pedidos importados sem vínculo CRM (email ausente)
❌ N erros (com detalhes por linha)

Receita importada: R$ X.XXX,XX
Período: DD/MM/YYYY a DD/MM/YYYY
```

---

## 11. Interface do Usuário

### Fluxo no componente

1. **Seletor de provider** (Hotmart selecionado por padrão; preparado para expansão)
2. **Upload do arquivo CSV** com validação de formato (detecta colunas obrigatórias)
3. **Preview** — primeiras 20 linhas normalizadas + contagem total de pedidos/itens
4. **Resumo de totais** — receita, período, qtd de pedidos/itens/contatos detectados
5. **Botão "Importar"** — só habilitado após preview validado
6. **Progress bar** — atualizada a cada lote de 200 processado
7. **Resultado** — cards com métricas + lista de erros se houver

### Volume e chunking

- Sem limite no número de linhas do CSV (qualquer histórico)
- Parse completo no browser (rápido, sem timeout)
- Envio em lotes de **200 grupos** por chamada à edge function (evita timeout de 60s do Deno)
- O componente encadeia as chamadas e agrega os resultados parciais

### Localização no produto

- Rota: `/app/:projectCode/configuracoes/importar-historico`
- Área: Configurações → Integrações → Importar Histórico
- Acesso: admin do projeto

---

## 12. Extensibilidade para Novos Providers

Para adicionar um novo provider (ex: Kiwify):

1. Criar `supabase/functions/provider-csv-import/providers/kiwify.ts`
   - Implementar interface `ProviderMapper` com: `detect()`, `parseRow()`, `groupRows()`
2. Registrar no roteador `index.ts`
3. Criar `src/components/settings/providers/KiwifyCSVParser.ts` para parse no browser
4. Adicionar opção no seletor de provider do componente React

O `core/` (order-writer, ledger-writer, contact-writer, dedup-checker) **não muda**.

---

## 13. Relação com outras áreas do Cubo

```
CSV Import
    ↓
orders (financeiro) ──────→ ledger_events → dashboards / funil / busca rápida
    ↓
order_items ──────────────→ modal de pedido / análise de produtos
    ↓
crm_contacts ─────────────→ CRM → segmentações → automações → WhatsApp → etc.
    ↓
offer_mappings ───────────→ fallback já existente (via webhook, mantido)
```

Ao importar um histórico CSV, os compradores entram automaticamente no CRM e ficam disponíveis para todas as outras áreas do Cubo.

---

## 14. O que NÃO fazer (Anti-patterns)

- ❌ Nunca sobrescrever `ledger_events` de webhook com dados do CSV
- ❌ Nunca inferir valores financeiros que não estão explícitos no CSV
- ❌ Nunca fazer INSERT em `ledger_events` sem SELECT prévio por `provider_event_id`
- ❌ Nunca usar o código antigo (`HotmartLedgerCSVImport`, `HotmartUnifiedCSVImport`) — formato diferente
- ❌ Nunca atualizar `orders.customer_paid` se o order já veio do webhook
- ❌ Nunca descartar um pedido só porque o email está ausente — importar sem contact_id
- ❌ Nunca colocar valor convertido em `customer_paid` quando a moeda é estrangeira
- ❌ Nunca agrupar renovações de assinatura (C2, C3) sob o pedido original

---

## 15. Arquivos existentes a preservar / descontinuar

| Arquivo | Ação | Motivo |
|---------|------|--------|
| `HotmartLedgerCSVImport.tsx` | Manter por ora | Serve ao formato antigo de CSV; avaliar remoção após novo fluxo estável |
| `HotmartCSVImport.tsx` | Manter | Atualização de contatos — escopo diferente, ainda válido |
| `csv-ledger-v21-import` (fn) | Manter por ora | Complementa ledger de orders existentes — escopo diferente |
| `HotmartUnifiedCSVImport.tsx` | Substituir | Tentativa anterior com formato errado; remover após novo fluxo estável |
| `SalesHistoryOrdersImport.tsx` | Descontinuar | Escrevia só em `sales_history_orders`, fora do canônico |
