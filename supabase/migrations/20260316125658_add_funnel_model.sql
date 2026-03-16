ALTER TABLE public.funnels
  ADD COLUMN IF NOT EXISTS funnel_model text;

ALTER TABLE public.funnels
  ADD CONSTRAINT funnels_model_check
    CHECK (funnel_model IS NULL OR funnel_model IN (
      'perpetuo',
      'meteorico',
      'lancamento',
      'lancamento_pago',
      'lancamento_interno',
      'webinar',
      'assinatura',
      'high_ticket',
      'custom'
    ));

COMMENT ON COLUMN public.funnels.funnel_model IS
  'Modelo detalhado do funil. Complementa funnel_type com granularidade adicional. '
  'perpetuo/meteorico → usados com funnel_type=perpetuo. '
  'lancamento/lancamento_pago/lancamento_interno/webinar → usados com funnel_type=lancamento. '
  'assinatura/high_ticket/custom → independentes. NULL = não classificado.';
