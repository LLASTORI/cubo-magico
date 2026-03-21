# TRACKING.md — Arquitetura de Tracking, Atribuição e Decisão

> Documento técnico-estratégico. Define princípios, modelos, hierarquias e fases de maturidade
> do sistema de tracking independente do Cubo Mágico.
> Este arquivo NÃO é backlog — é arquitetura de referência.
> Última atualização: 20/03/2026

---

## Frases-Chave (Princípios Imutáveis)

> **session_id conecta**
> **SCK explica**
> **webhook valida**
> **event_id deduplica**
> **confidence qualifica**
> **Cubo decide**

Quem controla o dado, controla o algoritmo.

---

## 1. Visão Geral

O Cubo Mágico não depende de plataformas como Meta Ads ou Google Ads como fonte de verdade.
Ele constrói sua própria camada de tracking independente, com atribuição confiável e decisão baseada em dados validados.

### O que o sistema faz

- **Tracking independente** — coleta identidade e contexto de marketing no browser
- **Atribuição confiável** — conecta clique → sessão → venda com múltiplos modelos
- **Validação financeira real** — baseada exclusivamente no Ledger (webhook como fonte de verdade)
- **Confidence scoring** — mede a confiabilidade de cada atribuição
- **Decisão automatizada** — transforma dados em ações (fases futuras)
- **Reverse CAPI** — devolve conversões reais e enriquecidas para as plataformas (fase futura)

### Hierarquia fundamental

```
Browser > Provider > Inferência
```

Espelho exato do financeiro:

```
Webhook > API > CSV
```

Nenhuma informação crítica depende de um único canal. Redundância é intencional.

---

## 2. Identidade do Sistema

### 2.1 cubo_session_id

Identificador de sessão de marketing. É o backbone do sistema — conecta tudo, mas não define nada sozinho.

- **Geração:** UUID v4, sempre no browser, no primeiro contato
- **Persistência:** cookie (14 dias) + localStorage (redundância)
- **Prioridade de leitura:** URL param > cookie > localStorage > gerar novo
- **Duração recomendada:** 14 dias (alinhado ao ciclo de decisão do infoprodutor)

**Regra crítica:**
```
Novo UTM chegou → nova sessão (novo cubo_session_id)
Sem UTM → mantém sessão existente
```

O `cubo_session_id` não é ID de usuário. É sessão de marketing.
Um usuário pode ter múltiplos session_ids ao longo do tempo (um por campanha clicada).

**Geração (conceito):**
```javascript
function getOrCreateSessionId() {
  // 1. Tenta URL param (veio de link rastreado)
  const urlId = new URLSearchParams(window.location.search).get("cubo_session_id");
  if (urlId) {
    setCookie("cubo_session_id", urlId, 14);
    localStorage.setItem("cubo_session_id", urlId);
    return urlId;
  }

  // 2. Tenta cookie
  const cookieId = getCookie("cubo_session_id");
  if (cookieId) return cookieId;

  // 3. Tenta localStorage
  const lsId = localStorage.getItem("cubo_session_id");
  if (lsId) return lsId;

  // 4. Gera novo
  const newId = generateUUID();
  setCookie("cubo_session_id", newId, 14);
  localStorage.setItem("cubo_session_id", newId);
  return newId;
}
```

---

### 2.2 cubo_user_id

Identificador de jornada completa do usuário. Permite atribuição cross-session (multi-toque real).

- **Geração:** hash do e-mail (quando disponível) ou atribuído via login/lead/webhook
- **Persistência:** backend (`tracking_sessions`) + cookie longo
- **Diferença do session_id:** enquanto o session_id muda a cada nova campanha, o user_id persiste

**Decisão em aberto:** um usuário pode comprar com e-mail diferente do cadastro. Essa limitação deve ser monitorada e tratada futuramente via matching probabilístico ou confirmação manual.

**Nota:** O sistema nasce já com suporte a ambos (`cubo_session_id` + `cubo_user_id`) para evitar refatoração futura.

---

### 2.3 SCK v2 — Identidade Portátil de Marketing

O SCK é o DNA do marketing dentro do Cubo. Ele carrega contexto completo de origem de forma estruturada, versionada e independente de provider.

**Formato:**
```
v2|src=facebook|med=cpc|cmp=campanha_x|term=publico_y|cont=criativo_z|pg=home|sid=cubo_session_id|ref=instagram.com
```

**Campos:**

| Campo | Significado |
|-------|-------------|
| `src` | utm_source |
| `med` | utm_medium |
| `cmp` | utm_campaign |
| `term` | utm_term |
| `cont` | utm_content |
| `pg` | page_name (slug da página) |
| `sid` | cubo_session_id |
| `ref` | referrer (hostname) |

**Por que v2 é superior ao formato antigo (pipe simples):**
- Versionado (`v2|`) — permite evoluir sem quebrar histórico
- Ordem independente — parsing por chave, não por posição
- Campos opcionais — funciona mesmo incompleto
- Extensível — novos campos sem breaking change

**Build (conceito):**
```javascript
function buildSCKv2(data) {
  const parts = ["v2"];
  if (data.utm_source)   parts.push(`src=${data.utm_source}`);
  if (data.utm_medium)   parts.push(`med=${data.utm_medium}`);
  if (data.utm_campaign) parts.push(`cmp=${data.utm_campaign}`);
  if (data.utm_term)     parts.push(`term=${data.utm_term}`);
  if (data.utm_content)  parts.push(`cont=${data.utm_content}`);
  if (data.page_name)    parts.push(`pg=${data.page_name}`);
  if (data.session_id)   parts.push(`sid=${data.session_id}`);
  if (data.referrer)     parts.push(`ref=${data.referrer}`);
  return parts.join("|");
}
```

**Parser com backward compatibility:**
```javascript
function parseSCK(sck) {
  if (!sck) return {};
  const parts = sck.split("|");
  if (parts[0] !== "v2") return parseLegacySCK(sck); // compatibilidade v1
  let data = {};
  parts.slice(1).forEach(p => {
    const [key, value] = p.split("=");
    data[key] = value;
  });
  return data;
}
```

**Importante:** O SCK não é para a Meta. É para o Cubo. A Meta usa fbclid/fbc. O SCK é o sistema de identidade de marketing interno.

---

### 2.4 event_id — Chave de Deduplicação

Identificador único por intenção de conversão. Garante que 1 venda real = 1 evento, independente de quantos sistemas a reportem (Pixel + CAPI + Webhook).

- **Geração:** `cubo_session_id + "_" + timestamp`
- **Nasce:** no browser, no momento da intenção de compra
- **Viaja:** via URL, via SCK, via Pixel, via CAPI
- **Usado pelo webhook:** para conectar venda ao evento de browser

```
1 conversão real = 1 event_id
```

---

### 2.5 XCOD / LeadUserIndex (Hotmart-exclusivo)

Identificador de usuário proprietário da Hotmart. Presente apenas em integrações Hotmart.

- Não é universal — não depender dele para o modelo canônico
- Quando presente: `external_id = XCOD` nos eventos CAPI
- O `cubo_session_id` é o equivalente universal do XCOD para outros providers

---

## 3. Transporte de Identidade (Caminho B)

Identidade não pode ser frágil. Ela viaja por múltiplos canais simultaneamente.

| Canal | Dado transportado | Confiabilidade |
|-------|-------------------|----------------|
| URL param | `cubo_session_id`, `event_id` | Alta |
| SCK (campo `sid`) | `cubo_session_id` | Alta (redundância) |
| Cookie | `cubo_session_id`, UTMs, click IDs | Alta |
| localStorage | `cubo_session_id` | Média (fallback) |
| Backend (`tracking_sessions`) | tudo | Máxima |

O backend é o net de segurança final. Quando o script registra a sessão via Edge Function, mesmo que URL e cookies falhem no checkout, o Cubo consegue recuperar via SCK ou session_id armazenado.

---

## 4. Canonical Tracking Model (CTM)

Cada provider fala uma língua diferente. O Cubo não padroniza a entrada — padroniza a leitura.

### Modelo canônico

```sql
tracking_identity
-----------------
id                  uuid
session_id          text   -- cubo_session_id
user_id             text   -- cubo_user_id (quando disponível)
tracking_key        text   -- SCK v2 completo
source              text
medium              text
campaign            text
term                text
content             text
page_name           text
referrer            text
provider_origin     text   -- 'hotmart' | 'kiwify' | 'eduzz' | ...
raw_payload         jsonb  -- payload bruto do provider
confidence_level    text   -- 'high' | 'medium' | 'low' | 'none'
confidence_score    float
created_at          timestamptz
```

### Camada de tradução: tracking_adapter/

Cada provider tem seu próprio adapter. O destino é sempre o modelo canônico.

```
tracking_adapter/
  hotmart.ts    → parseia SCK + XCOD
  kiwify.ts     → parseia UTMs
  eduzz.ts      → parseia UTMs + source
  hubla.ts      → parseia UTMs parciais
  generic.ts    → fallback para qualquer provider
```

**Exemplos de tradução:**

Hotmart:
```javascript
function fromHotmart(payload) {
  const sck = parseSCK(payload.sck);
  return {
    source: sck.src,
    medium: sck.med,
    campaign: sck.cmp,
    term: sck.term,
    content: sck.cont,
    page_name: sck.pg,
    tracking_key: payload.sck,
    session_id: sck.sid || payload.xcod,
    provider_origin: 'hotmart',
    confidence: 'high'
  };
}
```

Kiwify / Eduzz / outros:
```javascript
function fromUTMProvider(payload, providerName) {
  return {
    source: payload.utm_source || payload.source || payload.src || null,
    medium: payload.utm_medium || null,
    campaign: payload.utm_campaign || null,
    term: payload.utm_term || null,
    content: payload.utm_content || null,
    tracking_key: null,
    session_id: payload.cubo_session_id || null,
    provider_origin: providerName,
    confidence: payload.utm_source ? 'medium' : 'low'
  };
}
```

**Regra de prioridade de origem:**
```
Se existe SCK v2 → usa SCK
Senão → usa UTMs
Senão → usa source/src
Senão → desconhecido
```

---

## 5. Tracking Sessions (Backend)

Tabela que persiste a sessão de marketing no backend, permitindo enriquecimento do webhook mesmo quando URL params se perdem.

```sql
tracking_sessions
-----------------
id                  uuid
project_id          uuid        -- isolamento multi-tenant
cubo_session_id     text        -- chave principal de busca
cubo_user_id        text
sck                 text        -- SCK v2 completo
utm_source          text
utm_medium          text
utm_campaign        text
utm_term            text
utm_content         text
page_name           text
referrer            text
created_at          timestamptz
```

**Fluxo:** quando o usuário entra na página, o script envia via Edge Function `/track-session`. Quando o webhook chega, o Cubo busca a sessão pelo SCK ou `cubo_session_id` e enriquece a venda com a origem real.

---

## 6. Tracking Touches (Multi-toque)

Cada interação relevante do usuário é um "touch". Isso permite atribuição multi-touch no futuro.

```sql
tracking_touches
----------------
id                  uuid
project_id          uuid
cubo_session_id     text
cubo_user_id        text
timestamp           timestamptz
source              text
medium              text
campaign            text
term                text
content             text
sck                 text
touch_type          text   -- 'click' | 'pageview' | 'utm_session'
```

---

## 7. Modelos de Atribuição

O Cubo calcula múltiplos modelos simultaneamente. O usuário escolhe a visão — não existe modelo único certo.

| Modelo | Descrição | Uso ideal |
|--------|-----------|-----------|
| Last Click | Último touch antes da compra | Default, decisões rápidas |
| First Click | Primeiro contato | Análise de aquisição |
| Linear | Divide igualmente entre todos | Visão completa da jornada |
| Time Decay | Mais peso para toques mais recentes | Mais realista |
| Position Based | 40% primeiro + 40% último + 20% meio | Equilíbrio aquisição/conversão |

**Default no dashboard:** Last Click com opção de alternar.

**Diferencial:** mostrar o mesmo ROAS em diferentes modelos revela a real contribuição de cada campanha.

---

## 8. Janela de Atribuição

Define até quantos dias antes da compra um touch pode receber crédito.

| Janela | Uso |
|--------|-----|
| 1 dia | Conversão quente |
| 7 dias | Padrão Meta Ads |
| 14 dias | **Default do Cubo** |
| 30 dias | Ciclo longo / remarketing |

**Default:** 14 dias — alinhado ao cookie, ao ciclo de decisão do infoprodutor e à janela do `cubo_session_id`.

**O Cubo calcula os 4 simultaneamente** (`ROAS_1d`, `ROAS_7d`, `ROAS_14d`, `ROAS_30d`). A comparação entre janelas revela o tempo de maturação da campanha.

**Timestamp de referência:** sempre o timestamp do webhook (data real da venda), nunca o do browser.

```sql
WHERE touch_timestamp >= purchase_date - INTERVAL '14 days'
```

---

## 9. Deduplicação de Eventos

Uma venda pode ser reportada por Pixel, CAPI (Stape) e Webhook simultaneamente. Sem deduplicação, 1 venda = 3 conversões.

```sql
conversion_events
-----------------
id                  uuid
event_id            text        -- chave de deduplicação
cubo_session_id     text
cubo_user_id        text
source              text
campaign            text
event_type          text   -- 'pixel' | 'capi' | 'webhook'
revenue             numeric
currency            text
status              text   -- 'pending' | 'confirmed' | 'refunded'
created_at          timestamptz
```

**Lógica:**
```
Chegou evento com event_id X:
  Já existe? → merge / atualiza status
  Não existe? → cria novo registro
```

**Quem manda no valor:** sempre o webhook (Ledger).
**Quem manda no tracking:** SCK / session.
**Quem organiza:** event_id.

---

## 10. Confidence Model

Mede a confiabilidade de cada atribuição. Separa ROAS bruto de ROAS confiável.

### Score (0 a 1)

| Sinal | Peso |
|-------|------|
| tem `cubo_session_id` | +0.30 |
| tem SCK v2 | +0.30 |
| SCK completo (todos os campos) | +0.20 |
| tem UTMs | +0.10 |
| tem referrer | +0.05 |
| tem `event_id` | +0.05 |

### Níveis

| Nível | Score | Significado |
|-------|-------|-------------|
| HIGH | 0.9 – 1.0 | Atribuição confiável — usar para decisões |
| MEDIUM | 0.5 – 0.8 | Aceitável — usar com cautela |
| LOW | 0.1 – 0.4 | Fraco — não usar para escala |
| NONE | 0 | Sem origem — excluir de análises |

### Impacto prático

```
Receita total:         R$ 100.000
Alta confiança (HIGH): R$  70.000  ← base para decisões
Média (MEDIUM):        R$  20.000
Baixa (LOW):           R$  10.000
```

**Alerta automático:** se o volume de LOW/NONE aumentar, o tracking pode estar quebrado.

---

## 11. Reverse CAPI (Fase 4)

O Cubo envia conversões validadas de volta para Meta/Google, ensinando o algoritmo com dados reais em vez de depender do pixel.

**Diferencial:** o evento enviado pelo Cubo tem valor real (ledger BRL), origem real (SCK), e passa pelo filtro de confidence. É superior ao que o pixel ou Stape enviam.

**Regra de envio:**
```
confidence >= 0.7 → envia
confidence < 0.7 → segura (não "ensinar errado" o algoritmo)
```

**Coexistência com Stape:**
```
Pixel (browser)  → velocidade, tempo real
CAPI via Stape   → redundância, server-side
Cubo Reverse CAPI → precisão, dado validado
```

**Estrutura do evento (Meta CAPI):**
```json
{
  "event_name": "Purchase",
  "event_time": 1710000000,
  "event_id": "abc123_1710000000",
  "user_data": {
    "external_id": "cubo_user_id",
    "fbc": "...",
    "fbp": "..."
  },
  "custom_data": {
    "currency": "BRL",
    "value": 197.00,
    "campaign": "campanha_x",
    "source": "facebook",
    "confidence": 0.92
  }
}
```

**Fila de envio:**
```sql
conversion_outbox
-----------------
id, event_id, payload_json
status   -- 'pending' | 'sent' | 'failed' | 'retrying'
sent_at, created_at
```

**Latência recomendada:** +5 a +15 minutos após webhook (dados mais completos antes de enviar).

---

## 12. Decision Engine (Fase 5)

Transforma dados confiáveis em ações sobre campanhas. O playbook do gestor de tráfego codificado em regras.

### Estrutura de regras

```sql
decision_rules
--------------
id, name
condition_json   -- { "roas_7d": ">2.5", "confidence": ">0.7", "sales": ">=3" }
context_json     -- { "product_type": "infoproduct", "min_spend": 100 }
action           -- 'pause' | 'scale_up' | 'scale_down' | 'alert' | 'no_action'
intensity        -- 10 | 20 | 30 (%)
priority         -- número (maior = mais importante)
active           boolean
```

**Prioridade de conflito:**
```
pause > reduce > scale > alert
```

**Exemplos de regras reais:**

```json
{
  "name": "kill_no_sales",
  "condition": { "spend": ">=cpa_expected", "sales": "=0" },
  "action": "pause",
  "priority": 100
}

{
  "name": "scale_high_roas",
  "condition": { "roas_7d": ">=2.5", "confidence": ">=0.7", "sales": ">=3" },
  "action": "scale_up",
  "intensity": 20,
  "priority": 50
}

{
  "name": "hold_low_confidence",
  "condition": { "roas": ">=2.5", "confidence": "<0.5" },
  "action": "no_action",
  "priority": 80
}
```

### Log de decisões

```sql
decision_logs
-------------
id, campaign_id
rule_applied
metrics_snapshot   -- jsonb com ROAS, spend, confidence no momento
decision, reason
created_at
```

### Modos de operação

| Modo | Descrição |
|------|-----------|
| Insight | Cubo mostra, humano decide |
| Assistido | Cubo sugere com motivo, humano executa |
| Semi-automático | Cubo sugere, humano aprova, Cubo executa |
| Automático | Cubo executa (apenas com confidence muito alto) |

**Ordem de adoção:** sempre começar por Insight. Automático só após validação extensiva.

**Frequência de análise:**
```
A cada 1h  → análise leve (alertas)
A cada 6h  → decisões táticas
A cada 24h → decisões estratégicas (escala/corte)
```

---

## 13. Roadmap de Maturidade

```
Fase 1 — Tracking Base
  ├── cubo_session_id + cubo_user_id
  ├── SCK v2
  ├── Script de browser (captura + injeção)
  └── tracking_sessions (Edge Function)

Fase 2 — Atribuição
  ├── tracking_touches
  ├── Canonical Tracking Model
  ├── tracking_adapter/ (Hotmart + Kiwify + Eduzz)
  └── Modelos de atribuição (Last Click default)

Fase 3 — Confidence
  ├── Confidence scoring por venda
  ├── ROAS confiável vs ROAS bruto
  ├── conversion_events (deduplicação)
  └── Alertas de tracking quebrado

Fase 4 — Reverse CAPI
  ├── conversion_outbox
  ├── Envio para Meta CAPI
  ├── Filtro por confidence >= 0.7
  └── Coexistência com Stape

Fase 5 — Decision Engine
  ├── decision_rules configuráveis
  ├── decision_logs
  ├── Modo assistido → semi-automático
  └── Aprendizado por resultado
```

---

## 14. Decisões em Aberto

| Decisão | Status | Impacto |
|---------|--------|---------|
| `cubo_user_id` via email hash vs outro método | Em aberto | Atribuição cross-session |
| Script unificado (VERSÃO 3 vs XCOD vs novo) | Em aberto | Implementação Fase 1 |
| Valor a enviar no Reverse CAPI (bruto vs líquido) | Em aberto | Otimização do algoritmo Meta |
| Limites éticos de personalização por comportamento social | Em aberto | Perfil Cognitivo (ver VISION.md) |
| Matching probabilístico para user_id sem email | Futuro | Fase 3+ |

---

## 15. Tabelas Novas (Resumo)

| Tabela | Fase | Propósito |
|--------|------|-----------|
| `tracking_sessions` | 1 | Persiste sessão de marketing no backend |
| `tracking_touches` | 2 | Histórico de interações por sessão/usuário |
| `tracking_identity` | 2 | Modelo canônico normalizado por provider |
| `conversion_events` | 3 | Deduplicação Pixel + CAPI + Webhook |
| `conversion_outbox` | 4 | Fila de envio Reverse CAPI |
| `decision_rules` | 5 | Regras configuráveis do Decision Engine |
| `decision_logs` | 5 | Auditoria de decisões tomadas |

---

## Referências Cruzadas

- **Financeiro / Ledger:** ver regras críticas em `CLAUDE.md`
- **Multi-provider:** ver seção 9 em `VISION.md`
- **Perfil Cognitivo / Social Listening:** ver seções 1 e 5 em `VISION.md`
- **Funil de Conteúdo (C1/C2/C3):** ver seção 2 em `VISION.md`
