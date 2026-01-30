# Contrato: Paid Media Provider Interface

## Objetivo

Definir a interface que cada provider de mídia paga (Meta, Google, TikTok, etc.) deve implementar para integrar com o domínio de Paid Media.

## Escopo

Contrato de integração para providers externos de mídia paga.

## Fontes Canônicas

Cada provider mantém suas próprias tabelas prefixadas:
- Meta: `meta_*`
- Google: `google_*` (futuro)
- TikTok: `tiktok_*` (futuro)

## Métricas / Entidades

### Interface Obrigatória

Cada provider DEVE expor os seguintes dados para o domínio:

```typescript
interface PaidMediaProvider {
  // Identificação
  provider_name: string;
  
  // Contas
  getActiveAccounts(): Account[];
  
  // Hierarquia
  getCampaigns(account_id: string): Campaign[];
  getAdSets(campaign_id: string): AdSet[];
  getAds(adset_id: string): Ad[];
  
  // Métricas
  getDailyInsights(date_range: DateRange): DailyInsight[];
  
  // Status
  getCredentialsStatus(): CredentialsStatus;
  getSyncStatus(): SyncStatus;
}
```

### Mapeamento para Domínio

| Provider Field | Domain Field |
|----------------|--------------|
| (provider-specific) | spend |
| (provider-specific) | impressions |
| (provider-specific) | clicks |
| (provider-specific) | reach |
| (provider-specific) | ctr |
| (provider-specific) | cpc |
| (provider-specific) | cpm |

## Invariantes

1. Provider NUNCA expõe dados diretamente para UI/hooks de análise
2. Provider SEMPRE passa pelo domínio de Paid Media
3. Autenticação e refresh são responsabilidade exclusiva do Provider
4. Erros de sincronização devem ser logados e expostos via status
5. Provider deve suportar sincronização incremental (delta sync)

## O que NÃO faz parte do contrato

- Implementação interna de cada provider
- Schemas específicos de banco (são decisão de cada provider)
- Lógica de retry/backoff
- UI de configuração de contas

## Status

✅ Ativo (definição de interface)
⚠️ Providers implementados: Meta
⚠️ Providers pendentes: Google, TikTok

---

*Última atualização: 2026-01-30*
