# Guia para iniciante: 3 tarefas de segurança em PRs

Este guia te ajuda a decidir entre **uma PR única** ou **PRs separadas** ao corrigir vulnerabilidades do `npm audit`.

## Recomendação prática

Para quem está começando, o mais seguro é:

1. **PR 1 (runtime crítico/alto):** dependências que afetam o app em produção (ex.: `jspdf`, `react-router-dom`, `vite/esbuild`).
2. **PR 2 (tooling):** `eslint`, `@typescript-eslint/*`, `minimatch` e dependências de lint/build.
3. **PR 3 (governança):** documentação de risco residual, exceções temporárias e plano de remoção.

> Só faça **PR única** se todas as mudanças forem pequenas e você já validou build/testes sem regressão.

## Quando juntar em 1 PR

Use PR única apenas se:

- `npm audit fix` resolveu quase tudo sem `--force`;
- não houve upgrade major com quebra;
- build, testes e fluxo principal (ex.: geração de PDF) passaram;
- revisão da equipe é rápida e simples.

## Quando separar (recomendado para iniciantes)

Separe em PRs quando:

- existe `npm audit fix --force` com possível breaking change;
- você mexeu em libs de runtime e tooling ao mesmo tempo;
- ficou difícil saber qual pacote causou eventual bug;
- quer facilitar rollback.

## Passo a passo (bem direto)

### 0) Criar branch para cada etapa

```bash
git checkout main
git pull
git checkout -b chore/security-runtime
```

### 1) PR 1 — runtime (maior prioridade)

1. Atualize pacotes de runtime (ex.: `react-router-dom`, `vite`, `jspdf`/`jspdf-autotable`).
2. Rode:

```bash
npm install
npm audit
npm run build
npm test
```

3. Teste manual do que é sensível (ex.: tela que exporta PDF).
4. Commit:

```bash
git add package.json package-lock.json
git commit -m "chore(security): update runtime dependencies from audit"
git push -u origin chore/security-runtime
```

5. Abra a PR com descrição clara do que mudou e do que foi validado.

### 2) PR 2 — tooling (eslint/typescript-eslint/minimatch)

```bash
git checkout main
git pull
git checkout -b chore/security-tooling
```

1. Atualize apenas dependências de lint/build.
2. Rode:

```bash
npm install
npm run lint
npm run build
npm test
```

3. Corrija regras de lint que quebrarem.
4. Commit e push (mesmo padrão da PR 1).

### 3) PR 3 — risco residual/documentação

```bash
git checkout main
git pull
git checkout -b chore/security-audit-docs
```

1. Gere diagnóstico final:

```bash
npm audit --json > audit-report.json
```

2. Documente o que ainda sobrou (se sobrou), impacto e prazo de correção.
3. Commit com docs.

## Template curto de PR

**Título:** `chore(security): update runtime dependencies from npm audit`

**Descrição:**

- O que foi atualizado
- Vulnerabilidades reduzidas (antes/depois)
- Testes executados
- Riscos e rollback

## Checklist de aprovação

- [ ] `npm audit` reduziu vulnerabilidades críticas/altas de runtime
- [ ] `npm run build` passou
- [ ] testes passaram
- [ ] fluxo principal validado manualmente
- [ ] plano de rollback definido

---

Resumo: **você consegue juntar as 3 tarefas em uma PR só**, mas para iniciante o caminho mais seguro é **2 ou 3 PRs pequenas**, porque facilita revisão, diagnóstico e rollback.

## O que fazer agora (resposta direta)

Se você já executou as correções, siga esta regra simples:

- Se cada tema está em branch separada (`runtime`, `tooling`, `docs`): **abra PR e faça merge uma por uma**.
- Se está tudo no mesmo branch: **abra 1 PR única** (não tente separar depois sem necessidade).

### Ordem de merge recomendada

1. **Primeiro runtime** (impacta produção).
2. **Depois tooling** (lint/build).
3. **Por último docs/governança**.

### Fluxo prático de iniciante (uma por uma)

Para cada PR, repita:

1. Abrir PR no GitHub.
2. Esperar CI/checks verdes.
3. Fazer merge.
4. Atualizar `main` local:

```bash
git checkout main
git pull
```

5. Ir para a próxima branch e rebase/merge da `main` atualizada:

```bash
git checkout chore/security-tooling
git rebase main
```

6. Resolver conflitos (se houver), subir novamente e só então abrir/atualizar a próxima PR.

### Regra de ouro

**Sim: para iniciante, é melhor gerar e dar merge uma a uma.**
Fica mais fácil descobrir problema, reverter e não misturar risco de produção com ajustes de tooling.
