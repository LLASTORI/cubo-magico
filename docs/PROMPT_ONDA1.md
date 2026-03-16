# Prompt — Onda 1: campo `funnel_model`

Cole este prompt no Cursor para implementar a Onda 1.

---

Leia `debug_log.md`, `TASKS.md`, `docs/FUNNEL_TYPE_AUDIT.md` e `docs/FUNNEL_MODELS.md` antes de começar.

Implemente a Onda 1 conforme o plano da auditoria. Impacto baixo — campo nullable, sem breaking change.

**1. Migration SQL**
Criar `supabase/migrations/YYYYMMDDHHMMSS_add_funnel_model.sql`:
- Coluna `funnel_model text` nullable em `funnels`
- CHECK constraint com valores: `perpetuo`, `meteorico`, `lancamento`, `lancamento_pago`, `lancamento_interno`, `webinar`, `assinatura`, `high_ticket`, `custom`
- COMMENT na coluna explicando o propósito
- NÃO alterar `funnel_type` existente

**2. Tipos TypeScript**
Em `src/components/FunnelManager.tsx` (onde `FunnelType` vive):
- Adicionar type `FunnelModel` com os mesmos valores da constraint
- Adicionar `FUNNEL_MODEL_LABELS` com nomes amigáveis em português
- Adicionar `FUNNEL_MODEL_COLORS` seguindo o padrão visual existente de `FUNNEL_TYPE_COLORS`
- Atualizar interface `Funnel` com `funnel_model?: FunnelModel | null`

**3. UI — FunnelManager.tsx**
- Adicionar Select de `funnel_model` no form de criação e edição (campo opcional)
- Mostrar badge do modelo na listagem de funis ao lado do badge de `funnel_type`

**4. Regenerar tipos Supabase**
```
supabase gen types typescript --project-id mqaygpnfjuyslnxpvipa > src/integrations/supabase/types.ts
```

**5. Validar e commitar**
- Aplicar migration no banco
- Confirmar que funis existentes não quebraram (`funnel_model = NULL` é esperado)
- Commitar migration no git

Ao concluir, atualizar `debug_log.md` e `TASKS.md`.
