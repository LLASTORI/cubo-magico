# CRM Routing Fixes - PROMPT 22

Data: 2026-01-16

## Sumário das Correções

Este documento registra todas as correções de navegação e rotas aplicadas ao CRM conforme mapeado no PROMPT 21 (Auditoria Canônica).

---

## 1. Links Absolutos Corrigidos (CRÍTICO 🔴)

### Problema
Links usando `<Link to="/crm/contact/xxx">` ignoravam o tenant (projectCode), causando redirect para `/` ou perda de contexto.

### Correção Aplicada
Todos os links agora usam `getProjectUrl()` do hook `useProjectNavigation`.

### Arquivos Corrigidos

| Arquivo | Linha Original | Correção |
|---------|---------------|----------|
| `CustomerJourneyAnalysis.tsx` | `<Link to={/crm/contact/${id}}>` | `<Link to={getProjectUrl(/crm/contact/${id})}>` |
| `CustomerJourneyOrders.tsx` | `<Link to={/crm/contact/${id}}>` | `<Link to={getProjectUrl(/crm/contact/${id})}>` |
| `ContactPanel.tsx` | `<Link to={/crm/contact/${id}}>` | `<Link to={getProjectUrl(/crm/contact/${id})}>` |

---

## 2. navigate(-1) Substituído por Back Seguro (🟠)

### Problema
`navigate(-1)` pode falhar se não houver histórico (link direto, nova aba).

### Padrão Obrigatório
```tsx
const { navigateTo, navigate } = useProjectNavigation();

const handleBack = () => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigateTo('/fallback-path');
  }
};
```

### Arquivos Corrigidos

| Arquivo | Fallback |
|---------|----------|
| `CRMContactCard.tsx` | `/crm` |
| `AutomationFlows.tsx` | `/automations` |
| `QuizSessionViewer.tsx` | `/quizzes/${quizId}` |
| `DataDebug.tsx` | `/dashboard` |
| `NotificationsHistory.tsx` | `/dashboard` |

---

## 3. CRMSubNav Limpa (🟡)

### Problema
CRMSubNav continha links para Automações e WhatsApp, violando a arquitetura canônica onde CRM = Contexto do Cliente, não Operação.

### Correção
Removidos completamente da `navItems`:
- ❌ Automações
- ❌ Chat ao Vivo / WhatsApp

### Estrutura Final da CRMSubNav
```
- Análises (/crm)
- Comportamento UTM (/crm/utm-behavior)
- Pipeline (/crm/kanban)
- Atividades (/crm/activities)
- Recuperação (/crm/recovery)
```

---

## 4. isActive() Corrigida

### Problema
A função `isActive()` comparava paths sem considerar o prefixo `/app/:projectCode`, causando highlights incorretos.

### Correção
```tsx
const isActive = (item: NavItem) => {
  if (!projectCode) return false;
  
  const basePath = `/app/${projectCode}`;
  
  if (item.matchPaths) {
    return item.matchPaths.some(p => {
      const fullPath = `${basePath}${p}`;
      if (p === '/crm') {
        return currentPath === fullPath;
      }
      return currentPath.startsWith(fullPath);
    });
  }
  
  return currentPath === `${basePath}${item.path}`;
};
```

---

## 5. Regras Obrigatórias para Novos Desenvolvimentos

### ❌ PROIBIDO

```tsx
// Nunca usar link absoluto sem tenant
<Link to="/crm/contact/123" />

// Nunca usar navigate(-1) sem fallback
onClick={() => navigate(-1)}

// Nunca comparar paths sem projectCode
currentPath === '/crm'
```

### ✅ OBRIGATÓRIO

```tsx
// Sempre usar getProjectUrl
const { getProjectUrl } = useProjectNavigation();
<Link to={getProjectUrl(`/crm/contact/${id}`)} />

// Sempre usar back seguro
onClick={() => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigateTo('/fallback');
  }
}}

// Sempre comparar com projectCode
const basePath = `/app/${projectCode}`;
currentPath === `${basePath}/crm`
```

---

## 6. Checklist de Validação

### Testes Obrigatórios
- [ ] CRM → Jornada → Contato → Voltar (sem reset)
- [ ] CRM → Kanban → Contato → Voltar (mantém projeto)
- [ ] CRM → Automações (menu global) → Voltar → CRM (sem perder tenant)
- [ ] Link direto para contato funciona (`/app/xxx/crm/contact/yyy`)
- [ ] SubNav mantém highlight correto
- [ ] Nenhum redirect inesperado para `/`

---

## 7. Arquivos Alterados

1. `src/components/crm/CRMSubNav.tsx` - Removido Automações/WhatsApp + isActive corrigido
2. `src/components/crm/CustomerJourneyAnalysis.tsx` - Link para contato com getProjectUrl
3. `src/components/crm/CustomerJourneyOrders.tsx` - Link para contato com getProjectUrl
4. `src/components/whatsapp/ContactPanel.tsx` - Link para contato com getProjectUrl
5. `src/pages/CRMContactCard.tsx` - Back seguro com fallback para /crm
6. `src/pages/AutomationFlows.tsx` - Back seguro com fallback para /automations
7. `src/pages/QuizSessionViewer.tsx` - Back seguro com fallback para /quizzes
8. `src/pages/DataDebug.tsx` - Back seguro com fallback para /dashboard
9. `src/pages/NotificationsHistory.tsx` - Back seguro com fallback para /dashboard

---

## 8. Próximos Passos Recomendados

1. **Criar componente `SafeBackButton`** - Encapsular o padrão de back seguro
2. **ESLint Rule** - Proibir `<Link to="/crm/...">` sem `getProjectUrl`
3. **Auditoria Completa** - Buscar outros usos de links absolutos no codebase
4. **Testes E2E** - Adicionar testes de navegação para CRM

---

## Referências

- `docs/CRM_ROUTING_AND_NAVIGATION_AUDIT.md` - Auditoria completa (PROMPT 21)
- `docs/CRM_ARCHITECTURE_CANONICAL_MAP.md` - Mapa arquitetural (PROMPT 20)
- `ARCHITECTURE_NAVIGATION.md` - Documentação de navegação multi-tenant
