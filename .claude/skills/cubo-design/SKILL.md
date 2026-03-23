---
name: cubo-design
description: >
  Sistema de design do Cubo Magico. Use esta skill ao criar, refatorar ou
  melhorar qualquer componente visual do projeto - dashboards, cards, tabelas,
  modais, formularios, loading states, kanban, graficos e navegacao.
  Ativa automaticamente quando o contexto envolve UI, layout, estilo, cores,
  animacoes ou componentes React/Tailwind/shadcn.
keywords:
  - design
  - ui
  - componente
  - layout
  - estilo
  - cor
  - animacao
  - loading
  - dashboard
  - card
  - tabela
  - modal
  - formulario
  - kanban
  - grafico
---

# Cubo Magico - Sistema de Design

## Identidade Visual

O Cubo Magico e uma plataforma SaaS B2B para infoprodutores brasileiros.
O design deve transmitir: inteligencia, clareza, energia e confianca.
Inspiracoes visuais: paineis analiticos profissionais + jogos como Dota 2 /
Warcraft (profundidade, brilho sutil, animacoes com personalidade).
O cubo magico em si - com suas 6 faces coloridas - e parte central da identidade.

---

## Paleta de Cores

### Dark Mode (padrao)

Background principal:  #0f1117  (quase preto, nao preto puro)
Background cards:      #1a1f2e  (azul-escuro acinzentado)
Background elevated:   #222840  (para modais, dropdowns)
Border sutil:          #2a3050  (separadores e bordas de card)

Azul primario:         #2563eb  (acoes principais, botoes primarios)
Azul navy (hero):      #1e3a8a  (backgrounds de destaque, banners)
Ciano turquesa:        #22d3ee  (destaques, hover, links ativos, CTAs secundarios)
Ciano vibrante:        #00e5ff  (acentos, animacoes, elementos de energia)

Texto principal:       #f1f5f9
Texto secundario:      #94a3b8
Texto muted:           #475569

Sucesso:               #22c55e
Alerta:                #f59e0b
Erro:                  #ef4444

### As 6 Cores do Cubo (usar com moderacao - icones, badges, logo)

Vermelho:   #ef4444
Azul:       #3b82f6
Verde:      #22c55e
Amarelo:    #eab308
Laranja:    #f97316
Branco:     #f8fafc

### Light Mode

Background:            #f8fafc
Background cards:      #ffffff
Border:                #e2e8f0
Texto principal:       #0f172a
Texto secundario:      #475569
Primario:              #2563eb
Ciano:                 #0891b2

---

## Tipografia

- Fonte principal: Inter (ja carregada via shadcn)
- Titulos de dashboard: font-bold text-2xl ou maior, tracking-tight
- Labels de metricas: text-sm font-medium text-muted-foreground uppercase tracking-wide
- Valores de KPI: text-3xl font-bold na cor de destaque (ciano ou branco)
- Corpo/paragrafo: text-sm ou text-base, leading-relaxed
- Tagline do produto: estilo bold e direto - ex: "Funis que vendem. Dados que decidem."

---

## Componentes e Padroes

### Cards de Metrica (KPI)
- Background: bg-card com border border-border rounded-xl
- Icone no canto: quadrado arredondado com gradient das cores do cubo
- Valor em destaque: text-3xl font-bold text-cyan-400
- Label acima: text-xs text-muted-foreground uppercase tracking-wider
- Sutil brilho no hover: hover:border-cyan-500/40 transition-colors

### Cards Gerais
- rounded-xl border border-border bg-card p-6
- Nunca usar sombras pesadas - prefira bordas com opacidade
- Hover: hover:border-primary/30

### Botoes
- Primario: bg-blue-600 hover:bg-blue-500 text-white font-semibold
- CTA largo (estilo "Aplicar Filtros"): w-full bg-blue-600 rounded-lg py-3
- Secundario: border border-border bg-transparent hover:bg-accent
- Destrutivo: bg-red-600/10 text-red-400 border border-red-500/30

### Navegacao (Topbar)
- Background: levemente mais escuro que o fundo - bg-gray-950/80 backdrop-blur
- Itens ativos: highlight com ciano - text-cyan-400 border-b-2 border-cyan-400
- Dropdown: bg-gray-900 border border-gray-800 rounded-lg shadow-xl

### Formularios e Filtros
- Inputs: bg-gray-900 border border-gray-700 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500
- Labels: text-sm font-medium text-gray-300
- Placeholders: text-gray-500
- Secao de filtros: card com titulo + icone de filtro ciano

### Tabelas
- Header: bg-gray-900 text-xs uppercase tracking-wider text-gray-400
- Rows: border-b border-gray-800 hover:bg-gray-800/50
- Badges de status: pill colorido com bg opacity - ex: bg-green-500/10 text-green-400 border border-green-500/20

### Graficos (Recharts)
- Background: transparente (herda o card)
- Cores das linhas/barras: usar paleta do cubo - azul, ciano, verde, laranja
- Grid: stroke="#2a3050" (sutil)
- Tooltip: bg-gray-900 border border-gray-700 rounded-lg shadow-xl
- Sem bordas nos graficos de area - usar gradient fill com opacidade

---

## Animacoes e Loading States

### Filosofia de Animacao
Inspirado em Dota 2 / Warcraft: animacoes tem personalidade e proposito.
Nao sao decorativas - comunicam estado, energia e progresso.

### Loading de Dados (PRIORIDADE ALTA)
O cubo magico girando e a animacao central do produto - usar e reforcaar.

Regras de loading:
- Sempre mostrar skeleton em vez de spinner simples para conteudo com estrutura
- Spinners: apenas para acoes pontuais (botao de submit, sincronizar)
- Loading screens longas: usar o cubo magico animado
- Texto de loading com personalidade: "Girando os funis...", "Calculando suas vendas...", "Sincronizando dados..."

### Transicoes Gerais
- Hover/focus: transition: all 150ms ease
- Modais e dropdowns: opacity 200ms ease + transform 200ms ease
- Entrada de cards: fadeInUp 300ms ease forwards
- Botoes no hover: translateY(-1px)

### Efeitos Especiais (usar com moderacao)
- Glow sutil em elementos ativos: box-shadow: 0 0 20px rgba(34, 211, 238, 0.15)
- Gradient animado em banners hero: linear-gradient de navy para azul royal
- Particulas/pontos de conexao no background de login/hero (estilo constelacao)

---

## Hero Banner / Tela de Boas-vindas

Referencia: tela "Boa noite, Leandro"
- Background: bg-gradient-to-br from-blue-900 to-indigo-950
- Nome do usuario: text-cyan-400 font-bold (cor de destaque)
- Tagline: text-gray-300 italic
- Cubo magico 3D no canto direito: elemento decorativo fixo
- Badge de projeto ativo: pill verde com ponto animado

---

## O que NUNCA fazer

- NUNCA usar branco puro como background em dark mode
- NUNCA usar Inter como fonte de display sem ajuste de peso (use 700 ou 800)
- NUNCA usar gradiente roxo generico - o azul royal + ciano e a identidade
- NUNCA usar spinner generico em loading de dados com estrutura conhecida
- NUNCA usar sombras shadow-lg pesadas - prefira bordas com opacidade
- NUNCA criar componentes do zero quando shadcn tem equivalente
- NUNCA usar cores das 6 faces do cubo como cores de fundo - apenas acentos
- NUNCA usar animacoes longas (acima de 500ms) em interacoes repetitivas

---

## Stack Tecnica

- Framework: React 18 + TypeScript
- Estilo: Tailwind CSS (classes utilitarias - sem CSS customizado desnecessario)
- Componentes: shadcn/ui (SEMPRE preferir shadcn antes de criar do zero)
- Graficos: Recharts
- Icones: Lucide React
- Temas: next-themes (dark/light via classe dark no html)
- Animacoes: Tailwind animate-* + Framer Motion para animacoes complexas

---

## Checklist antes de entregar qualquer componente

- Funciona em dark mode E light mode?
- Usa componentes shadcn existentes (nao reinventou a roda)?
- Loading state implementado (skeleton ou spinner conforme contexto)?
- Estados de hover/focus/disabled definidos?
- Cores seguem a paleta do Cubo (sem roxo generico)?
- Responsivo (mobile-first)?
- Acessibilidade basica (aria-labels em icones, contraste adequado)?
