# Auditoria rápida — Cron de atualização Meta Ads

Este checklist ajuda a validar se a atualização periódica do Meta Ads está realmente ativa.

## 1) Confirmar se existe job agendado

```sql
select jobid, jobname, schedule, active, command
from cron.job
order by jobid desc;
```

> Se não houver linha para `meta-insights-cron`, a periodicidade não está configurada no banco.

## 2) Confirmar execução recente do cron

```sql
select j.jobid,
       j.jobname,
       jd.start_time,
       jd.end_time,
       jd.status,
       jd.return_message
from cron.job_run_details jd
join cron.job j on j.jobid = jd.jobid
where j.jobname ilike '%meta%'
order by jd.start_time desc
limit 50;
```

## 3) Confirmar efeitos no domínio de dados

```sql
-- insights recentes
select max(updated_at) as last_insight_update,
       count(*) filter (where date_start >= current_date - interval '2 days') as rows_2d
from meta_insights;

-- campanhas recentes
select max(updated_at) as last_campaign_update,
       count(*) as campaigns_total
from meta_campaigns;
```

## 4) Validar logs de execução por projeto

```sql
select project_id,
       max(received_at) as last_event,
       count(*) filter (where status = 'error') as errors,
       count(*) filter (where status = 'processed') as processed
from provider_event_log
where provider = 'meta'
  and raw_payload->>'event_type' in ('insights_sync')
group by 1
order by last_event desc;
```

## 5) Recomendações arquiteturais

- Garantir job horário para `meta-insights-cron` (janela curta: hoje + ontem).
- Manter `auto-sync` diário para janela maior (ex.: últimos 90 dias) como recuperação.
- Criar alerta quando houver `meta_insights` no período e `meta_campaigns` vazio para o projeto.
- Padronizar `ad_account_id` aceitando variantes (`123` e `act_123`) para evitar falhas silenciosas em filtros.
