# Arquitetura de Navegação Multi-Tenant — Cubo Mágico

## 📋 Resumo Executivo

O Cubo Mágico é uma aplicação **multi-tenant** onde cada projeto opera sob uma rota isolada:

```
/app/:projectCode/*
```

**Regra de Ouro:** Toda navegação interna DEVE manter o contexto do `projectCode`.

---

## 🏗️ Arquitetura de Rotas

### Hierarquia

```
/                           → Home pública
/auth                       → Login/Signup
/projects                   → Seletor de projetos
/app/:projectCode/          → TENANT ISOLADO
    ├── dashboard           → Overview do projeto
    ├── busca-rapida        → Busca rápida
    ├── funnel              → Análise de funil
    ├── crm/*               → CRM completo
    ├── surveys/*           → Pesquisas
    ├── quizzes/*           → Quizzes
    ├── insights/*          → Insights e análises
    ├── meta-ads            → Meta Ads
    ├── whatsapp/*          → WhatsApp
    ├── automations/*       → Automações
    ├── launch-dashboard    → Dashboard de lançamento
    └── settings            → Configurações
```

### Gates de Proteção

1. **ProtectedRoute** — Verifica autenticação
2. **ProjectBootstrapGate** — Inicializa projeto ou redireciona
3. **ProtectedAreaRoute** — Verifica permissões específicas

---

## ✅ Como Navegar Corretamente

### Hook Canônico

```tsx
import { useTenantNavigation } from '@/navigation';

function MinhaPage() {
  const { navigateTo, navigateToProject, projectCode } = useTenantNavigation();

  // ✅ Navegar dentro do tenant
  const irParaCRM = () => navigateTo('/crm');
  
  // ✅ Navegar com parâmetro
  const verContato = (id: string) => navigateTo(`/crm/contact/${id}`);
  
  // ✅ Trocar de projeto
  const trocarProjeto = (codigo: string) => navigateToProject(codigo, '/dashboard');

  return <button onClick={irParaCRM}>Ir para CRM</button>;
}
```

### Exemplos Corretos

```tsx
// ✅ CORRETO - Usa navigateTo
navigateTo('/crm');
navigateTo('/surveys');
navigateTo('/quizzes');
navigateTo('/settings');
navigateTo('/crm/contact/123');

// ✅ CORRETO - Gera URL para links externos
const url = getProjectUrl('/crm/contact/123');
// Resultado: /app/cm_xyz123/crm/contact/123
```

---

## ❌ O Que NUNCA Fazer

### Imports Proibidos (em páginas internas)

```tsx
// ❌ PROIBIDO - Importar useNavigate diretamente
import { useNavigate } from 'react-router-dom';

// ❌ PROIBIDO - Importar Link para rotas internas
import { Link } from 'react-router-dom';
```

### Navegações Proibidas

```tsx
// ❌ ERRADO - Perde o projectCode
navigate('/crm');
navigate('/surveys');
navigate('/quizzes');
navigate('/settings');
navigate('/dashboard');

// ❌ ERRADO - Link absoluto
<Link to="/crm">CRM</Link>
<Link to="/surveys">Pesquisas</Link>

// ❌ ERRADO - Navegar para raiz
navigate('/');
```

### Por Que Isso Quebra?

1. O `ProjectBootstrapGate` detecta ausência de `projectCode`
2. Tenta redirecionar para projeto padrão
3. Pode causar loops infinitos
4. Perde todo o contexto do projeto atual
5. Dados ficam inconsistentes

---

## 🔧 Exceções Permitidas

Estas rotas SÃO absolutas e PODEM usar `navigate()` direto:

```tsx
// ✅ OK - Rotas públicas/externas ao tenant
navigate('/auth');
navigate('/projects');
navigate('/privacy-policy');
navigate('/terms-of-service');
navigate('/forgot-password');
navigate('/reset-password');
```

Use `navigateAbsolute()` para clareza:

```tsx
const { navigateAbsolute } = useTenantNavigation();
navigateAbsolute('/auth'); // Explícito que é intencional
```

---

## 🛡️ Guardrails de Proteção

### 1. Script de Verificação

```bash
# Executa verificação de navegação
node scripts/check-tenant-navigation.js

# Em package.json
npm run check:navigation
```

### 2. Regra de ESLint

O projeto inclui regra que detecta:
- Imports diretos de `useNavigate`
- Imports de `Link` sem wrapper
- Navegações com paths absolutos

### 3. CI/CD

O script de verificação pode ser adicionado ao CI:

```yaml
# .github/workflows/check.yml
- name: Check Navigation
  run: node scripts/check-tenant-navigation.js
```

---

## 📁 Estrutura de Arquivos

```
src/
├── navigation/
│   └── index.ts              ← Hook canônico useTenantNavigation
├── hooks/
│   └── useProjectNavigation.ts ← Implementação base
└── pages/
    └── *.tsx                  ← DEVEM usar useTenantNavigation
```

---

## 🧪 Checklist de Code Review

Ao revisar PRs, verifique:

- [ ] Nenhum import de `useNavigate` de react-router-dom
- [ ] Nenhum `<Link to="/...">` com rota interna absoluta
- [ ] Nenhum `navigate('/...')` com rota interna
- [ ] Uso de `useTenantNavigation()` ou `useProjectNavigation()`
- [ ] Navegações usam `navigateTo()` para rotas internas

---

## 🚨 Erros Comuns e Soluções

### Erro: "Página redireciona para /"

**Causa:** Navegação absoluta sem projectCode
**Solução:** Trocar `navigate('/rota')` por `navigateTo('/rota')`

### Erro: "Loop infinito de redirecionamento"

**Causa:** Gate tentando redirecionar para projeto inexistente
**Solução:** Verificar se projectCode está na URL

### Erro: "Dados do projeto errado"

**Causa:** Escape do tenant durante navegação
**Solução:** Auditar todas as navegações do fluxo

---

## 📚 Referências

- `src/hooks/useProjectNavigation.ts` — Implementação do hook
- `src/navigation/index.ts` — Wrapper canônico
- `src/components/ProjectBootstrapGate.tsx` — Gate de inicialização
- `src/components/ProtectedRoute.tsx` — Gate de autenticação

---

## 📝 Histórico

| Data       | Versão | Descrição                          |
|------------|--------|------------------------------------|
| 2026-01-14 | 1.0    | Documentação inicial               |
| 2026-01-14 | 1.1    | Adicionado script de verificação   |

---

**Mantenedor:** Equipe Cubo Mágico  
**Última Atualização:** Janeiro 2026
