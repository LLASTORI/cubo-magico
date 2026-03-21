# UTM Table Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o redesign visual aprovado na tabela UTM — Opção C refinada: nome truncado com tooltip, status como dot + texto inline sem badge box, barra de participação full-width.

**Architecture:** Mudança puramente visual em `renderMetricsTable` dentro de `UTMAnalysis.tsx`. Nenhuma lógica de dados é alterada. Nenhuma nova dependência. O arquivo já tem mudanças uncommitted (headers, overflow-x-auto) que fazem parte do mesmo redesign e devem ser commitadas junto.

**Tech Stack:** React, Tailwind CSS, shadcn-ui (Badge removido da coluna Status, mantido na coluna ROAS)

---

## Arquivos

- **Modify:** `src/components/funnel/UTMAnalysis.tsx` — função `renderMetricsTable` (linhas ~826–957)

---

### Task 1: Ajustar coluna Nome — truncate com tooltip

**Arquivo:** `src/components/funnel/UTMAnalysis.tsx:853`

**O que mudar:** `break-words min-w-0 leading-snug` → `truncate` com `max-w-[220px]`. O `title={metric.name}` já existe e faz o tooltip nativo no hover.

- [ ] **Step 1: Editar o span do nome**

Localizar (linha ~853):
```tsx
<span className="break-words min-w-0 leading-snug" title={metric.name}>{metric.name}</span>
```

Substituir por:
```tsx
<span className="truncate max-w-[220px]" title={metric.name}>{metric.name}</span>
```

- [ ] **Step 2: Verificar no browser**

Rodar `npm run dev` e abrir a tela de Análise de Funil → aba UTM.
Esperado: nomes longos aparecem truncados com `…` e o tooltip nativo mostra o nome completo ao hover.

---

### Task 2: Substituir Badge de status por dot + texto inline

**Arquivo:** `src/components/funnel/UTMAnalysis.tsx:873–899`

**O que mudar:** Remover o `<Badge>` com fundo colorido. Substituir por `<div>` com dot colorido + texto simples colorido, sem caixa de fundo.

- [ ] **Step 1: Substituir o bloco de status**

Localizar (linhas ~873–899):
```tsx
<TableCell className="text-right">
  {metric.status ? (
    <Badge
      variant={metric.status === 'ACTIVE' ? "default" : metric.status === 'MIXED' ? "secondary" : metric.status === 'UNKNOWN' ? "outline" : "outline"}
      className={
        metric.status === 'ACTIVE' ? "bg-green-500/20 text-green-600 border-green-500/30" :
        metric.status === 'PAUSED' ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" :
        metric.status === 'UNKNOWN' ? "bg-gray-500/20 text-gray-500 border-gray-500/30" : ""
      }
    >
      {metric.status === 'ACTIVE' ? 'Ativo' :
       metric.status === 'PAUSED' ? 'Inativo' :
       metric.status === 'UNKNOWN' ? (
         <Tooltip>
           <TooltipTrigger asChild>
             <span className="flex items-center gap-1">
               Desconhecido
               <HelpCircle className="w-3 h-3" />
             </span>
           </TooltipTrigger>
           <TooltipContent>
             <p className="text-sm">Item não encontrado na hierarquia Meta. Sincronize os dados.</p>
           </TooltipContent>
         </Tooltip>
       ) : 'Misto'}
    </Badge>
  ) : '-'}
</TableCell>
```

Substituir por:
```tsx
<TableCell className="text-right">
  {metric.status ? (
    <div className="flex items-center justify-end gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        metric.status === 'ACTIVE' ? 'bg-green-500' :
        metric.status === 'PAUSED' ? 'bg-yellow-500' :
        metric.status === 'MIXED' ? 'bg-blue-400' :
        'bg-gray-500'
      }`} />
      {metric.status === 'UNKNOWN' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground cursor-help flex items-center gap-1">
              Desc. <HelpCircle className="w-3 h-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">Item não encontrado na hierarquia Meta. Sincronize os dados.</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className={`text-xs ${
          metric.status === 'ACTIVE' ? 'text-green-500' :
          metric.status === 'PAUSED' ? 'text-yellow-500' :
          metric.status === 'MIXED' ? 'text-blue-400' :
          'text-muted-foreground'
        }`}>
          {metric.status === 'ACTIVE' ? 'Ativo' :
           metric.status === 'PAUSED' ? 'Inativo' : 'Misto'}
        </span>
      )}
    </div>
  ) : <span className="text-xs text-muted-foreground">—</span>}
</TableCell>
```

- [ ] **Step 2: Verificar visualmente**

Esperado: status aparece como dot colorido + texto curto, sem caixa de fundo. Hover no "Desc." mostra tooltip.

---

### Task 3: Barra de participação full-width

**Arquivo:** `src/components/funnel/UTMAnalysis.tsx:946–950`

**O que mudar:** A `<Progress>` tem `w-12` (fixo 48px). Mudar o layout da célula para a barra ocupar o espaço disponível.

- [ ] **Step 1: Atualizar a célula de Participação**

Localizar (linhas ~946–950):
```tsx
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-2">
    <span>{metric.percentage.toFixed(1)}%</span>
    <Progress value={metric.percentage} className="w-12 h-2" />
  </div>
</TableCell>
```

Substituir por:
```tsx
<TableCell>
  <div className="flex items-center gap-2 min-w-[100px]">
    <Progress value={metric.percentage} className="flex-1 h-1.5" />
    <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">
      {metric.percentage.toFixed(1)}%
    </span>
  </div>
</TableCell>
```

Nota: remover `text-right` do `TableCell` — o alinhamento agora é controlado pelo `flex` interno.

- [ ] **Step 2: Verificar visualmente**

Esperado: barra ocupa o espaço da coluna com percentual fixo de 36px à direita. Linhas com alta participação têm barra visivelmente mais longa.

---

### Task 4: Commit final

- [ ] **Step 1: Verificar build sem erros**

```bash
npm run build
```
Esperado: sem erros TypeScript ou de compilação.

- [ ] **Step 2: Commit**

```bash
git add src/components/funnel/UTMAnalysis.tsx
git commit -m "feat: redesign tabela UTM — nome truncado, status dot+texto, barra participação full-width"
```

- [ ] **Step 3: Atualizar TASKS.md**

Mover `Redesign visual da tabela UTM` de `🔴 Próxima sessão` para `✅ Concluído` com data 2026-03-21.
