# Contrato: Paid Media Domain

## Objetivo

Definir os conceitos de domínio de mídia paga que são provider-agnósticos e devem ser consumidos por análises de funil, lançamentos e dashboards.

## Escopo

Abstração de dados de mídia paga independente de origem (Meta, Google, TikTok, etc.).

## Fontes Canônicas

Não definido neste contrato.

> Nota: Atualmente não existe camada de abstração implementada. Este contrato define o estado-alvo.

## Métricas / Entidades

### Métricas Diárias (por funil)
| Métrica | Tipo | Descrição |
|---------|------|-----------|
| spend | number | Gasto total em moeda local |
| impressions | number | Total de impressões |
| clicks | number | Total de cliques |
| reach | number | Alcance único |
| ctr | number | Click-through rate |
| cpc | number | Custo por clique |
| cpm | number | Custo por mil impressões |

### Hierarquia de Anúncios
| Entidade | Campos Mínimos |
|----------|----------------|
| Campaign | id, name, status |
| AdSet | id, name, campaign_id, status |
| Ad | id, name, adset_id, status |

### Conta de Anúncios
| Campo | Tipo | Descrição |
|-------|------|-----------|
| account_id | string | ID da conta |
| account_name | string | Nome da conta |
| is_active | boolean | Status de ativação |
| credentials_expire_at | timestamp | Expiração de credenciais |

### Conversões
| Campo | Tipo | Descrição |
|-------|------|-----------|
| actions | json | Ações/conversões por anúncio |

## Invariantes

1. Domínio de mídia paga é SEPARADO de domínio financeiro (Ledger)
2. Métricas de domínio devem ser consumíveis sem conhecer o provider
3. ROAS e CPA são derivados: `(Receita Ledger) / (Spend Domínio)`
4. Sincronização de dados é responsabilidade do Provider, não do Domínio

## O que NÃO faz parte do contrato

- Lógica de autenticação OAuth
- Endpoints específicos de API (Meta Graph, Google Ads API)
- Tabelas prefixadas com nome de provider (`meta_*`, `google_*`)
- Processo de sincronização/refresh

## Status

✅ Ativo (definição conceitual)
⚠️ Implementação pendente (sistema atual acoplado a Meta)

---

*Última atualização: 2026-01-30*
