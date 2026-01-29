# Contratos Arquiteturais — Cubo Mágico

Esta pasta contém os **contratos técnicos oficiais** do sistema Cubo Mágico.

## O que são contratos?

Contratos são documentos que definem:

- **Regras estruturais** que não podem ser violadas
- **Comportamentos esperados** de componentes críticos
- **Limites de responsabilidade** entre domínios
- **Invariantes** que devem ser preservadas em qualquer mudança

## Contratos Ativos

| Contrato | Domínio | Status |
|----------|---------|--------|
| [offer-mappings.md](./offer-mappings.md) | Catálogo de Ofertas | ✅ Ativo |

## Regras de Governança

### 1. Fonte de Verdade

Esta pasta é a **fonte oficial de verdade arquitetural** do sistema.

### 2. Versionamento

Todos os contratos são versionados junto com o código.

### 3. Conformidade

Qualquer PR que altere comportamento de:
- Catálogo de ofertas
- Funis
- Webhooks
- Providers
- Ledger financeiro

**DEVE** respeitar os contratos desta pasta.

### 4. Alterações em Contratos

Mudanças em contratos requerem:
- Justificativa técnica documentada
- Análise de impacto em sistemas dependentes
- Aprovação explícita do arquiteto responsável

## Audiência

- Desenvolvedores
- Produto
- Agentes de IA
- Arquitetos de sistema

---

*Última atualização: 2026-01-29*
