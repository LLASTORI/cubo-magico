# PROMPT — Onda 2 Pré-requisito: Tabela `launch_editions`

Leia `debug_log.md`, `TASKS.md`, `CLAUDE.md` e `FUNNEL_MODELS.md` (seção 3.1) antes de começar.
Esta tarefa cria a fundação para as métricas de lançamento pago recorrente.
**Somente o que está listado aqui. Nada além.**

Ao finalizar: atualizar `debug_log.md` e `TASKS.md`, commitar todas as migrations.

---

## Contexto

O lançamento pago na prática se repete em ciclos — mesma estrutura, mesmas campanhas,
ajustando apenas datas e preços. Cada ciclo é uma "Edição" ou "Turma".

Sem esse conceito, todas as edições ficam misturadas no mesmo funil e é impossível
separar métricas de janeiro de métricas de fevereiro.

---

## Tarefa 1 — Migration: criar tabela `launch_editions`

Criar `YYYYMMDDHHMMSS_create_launch_editions.sql`:

```sql
CREATE TABLE launch_editions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id       uuid NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            text NOT NULL,
  edition_number  integer NOT NULL DEFAULT 1,
  event_date      date,
  start_date      date,
  end_date        date,
  status          text NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned', 'active', 'finished')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_launch_editions_funnel_id ON launch_editions(funnel_id);
CREATE INDEX idx_launch_editions_project_id ON launch_editions(project_id);
CREATE UNIQUE INDEX idx_launch_editions_number
  ON launch_editions(funnel_id, edition_number);

-- RLS
ALTER TABLE launch_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "launch_editions_project_access" ON launch_editions
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

-- Trigger updated_at
CREATE TRIGGER set_launch_editions_updated_at
  BEFORE UPDATE ON launch_editions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE launch_editions IS
  'Edições (turmas) de um lançamento pago recorrente.
   Um funil de lançamento pago pode ter múltiplas edições ao longo do tempo,
   cada uma com suas próprias datas, fases e métricas.
   Intervalo entre edições é variável — definido pelo usuário.';

COMMENT ON COLUMN launch_editions.edition_number IS
  'Número sequencial da edição dentro do funil. Gerado automaticamente.';

COMMENT ON COLUMN launch_editions.event_date IS
  'Data do evento/pitch ao vivo. Define o fim da fase de ingressos.';
```

---

## Tarefa 2 — Migration: adicionar `edition_id` em `launch_phases`

Criar `YYYYMMDDHHMMSS_add_edition_id_to_launch_phases.sql`:

```sql
ALTER TABLE launch_phases
  ADD COLUMN IF NOT EXISTS edition_id uuid REFERENCES launch_editions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_launch_phases_edition_id
  ON launch_phases(edition_id);

COMMENT ON COLUMN launch_phases.edition_id IS
  'Edição à qual esta fase pertence. NULL = fase não associada a uma edição específica
   (compatibilidade com fases criadas antes do conceito de edições).';
```

**Importante:** `edition_id` é nullable — fases existentes não quebram.

---

## Tarefa 3 — Tipos TypeScript

Criar ou atualizar `src/types/launch-editions.ts`:

```typescript
export type EditionStatus = 'planned' | 'active' | 'finished';

export interface LaunchEdition {
  id: string;
  funnel_id: string;
  project_id: string;
  name: string;
  edition_number: number;
  event_date: string | null;       // ISO date string
  start_date: string | null;
  end_date: string | null;
  status: EditionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaunchEditionInsert {
  funnel_id: string;
  project_id: string;
  name: string;
  edition_number?: number;         // calculado automaticamente se omitido
  event_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: EditionStatus;
  notes?: string | null;
}

export interface LaunchEditionWithPhases extends LaunchEdition {
  phases: LaunchPhase[];           // usar tipo existente de launch_phases
}
```

---

## Tarefa 4 — Hook `useLaunchEditions`

Criar `src/hooks/useLaunchEditions.ts` com as seguintes operações:

**Queries:**
- `useEditions(funnelId)` — lista todas as edições de um funil, ordenadas por `edition_number`
- `useEdition(editionId)` — busca uma edição específica com suas fases

**Mutations:**
- `createEdition(data)` — cria nova edição
  - Calcula `edition_number` automaticamente (MAX atual + 1)
  - **Copia as fases da edição anterior** se existir:
    - Copia `phase_type`, `name`, `primary_metric`, `campaign_name_pattern`, `notes`
    - **Não copia** `start_date`, `end_date` — usuário define as novas datas
    - Define `edition_id` da nova edição nas fases copiadas
- `updateEdition(id, data)` — atualiza campos da edição
- `deleteEdition(id)` — deleta edição e suas fases (CASCADE)

**Regras:**
- Sempre filtrar por `project_id` via hook `useProject()` existente
- Usar TanStack Query com invalidação de cache após mutations
- Seguir padrão dos hooks existentes (`useLaunchPhases`, `useFunnelData`)

---

## Tarefa 5 — UI mínima (não construir dashboard completo)

Apenas o essencial para o usuário conseguir criar e gerenciar edições.
**Não construir análise ou métricas agora — só o CRUD.**

Adicionar aba "Edições" no componente de configuração do funil de lançamento
(onde hoje existe a aba "Fases" — `LaunchConfigDialog` ou equivalente):

**Lista de edições:**
- Nome, número, datas, status (badge)
- Botão "Nova Edição" → abre dialog de criação
- Botão de editar e deletar por edição

**Dialog de criação/edição:**
- Campo: Nome (text) — ex: "Janeiro 2026" ou "Turma 3"
- Campo: Data do evento (date picker)
- Campo: Início das vendas (date picker)
- Campo: Fim / encerramento (date picker)
- Campo: Observações (textarea, opcional)
- Ao criar: aviso "As fases da edição anterior foram copiadas como ponto de partida"

**Não implementar agora:**
- Análise de métricas por edição
- Comparativo entre edições
- Dashboard de passing diário por edição
- Qualquer gráfico ou visualização

---

## Checklist de encerramento

- [ ] 2 migrations criadas e commitadas
- [ ] Tipos TypeScript criados
- [ ] Hook `useLaunchEditions` funcionando
- [ ] UI mínima de CRUD de edições acessível no funil de lançamento
- [ ] Cópia automática de fases ao criar nova edição funcionando
- [ ] Build: zero erros
- [ ] `debug_log.md` atualizado
- [ ] `TASKS.md` atualizado: mover itens concluídos para ✅
