-- Fix: ledger_events unique constraint deve ser (order_id, provider_event_id)
-- não global (provider_event_id).
--
-- Causa raiz: produtos de coprodução Hotmart disparam webhooks para dois projetos
-- distintos (produtor e coprodutor) para a mesma transação. Ambos geram o mesmo
-- provider_event_id (ex: "HP3453704060_platform_fee_platform"). Com a constraint
-- global, o segundo a inserir recebe unique_violation e aborta sem criar seus
-- eventos de ledger (especialmente o sale_producer do projeto do produtor).
--
-- Correção: escopar a constraint ao order_id. Cada projeto tem seu próprio order_id,
-- então cada um pode ter seus próprios ledger_events com o mesmo provider_event_id.
-- Dentro do mesmo order, provider_event_id continua único (evita duplicatas reais).

ALTER TABLE ledger_events
  DROP CONSTRAINT ledger_events_provider_event_id_unique;

ALTER TABLE ledger_events
  ADD CONSTRAINT ledger_events_order_provider_event_unique
  UNIQUE (order_id, provider_event_id);
