# FUNNEL_MODELS.md — Modelos de Funis do Cubo Mágico

> Documento de referência estratégica. Base para o wizard de criação, IA analista e campo `funnel_model`.
> Os benchmarks aqui são **referências observadas em lançamentos reais** — não regras absolutas.
> O "jeito do Cubo" será construído gradualmente com mais dados ao longo do tempo.
> Referência principal: metodologia Willian Baldan (@willianbaldan) + debriefings reais
> Última atualização: 23/03/2026

---

## Filosofia do Cubo

O Cubo não mostra apenas dados — ele **interpreta** dados.
A vantagem única é cruzar Meta Ads (antes da venda) com Hotmart (depois da venda).
Cada modelo tem sua própria jornada, métricas críticas e pontos de falha.
O Cubo precisa saber qual modelo está sendo analisado para interpretar o que é normal, bom ou crítico.

---

## Modelos Existentes (já implementados)

### 1. Perpétuo Direto (`perpetuo`)

**O que é:** Funil sempre aberto. Lead clica no anúncio, cai na página, vai ao checkout e compra — tudo no mesmo momento.

**Jornada:**
```
Anúncio → Página de vendas → Checkout → Compra FRONT
                                              ↘ OB1 → OB2 → Upsell → Downsell
```

**Métricas críticas:**
- ROAS (principal)
- CPA Real vs CPA Máximo
- Connect Rate (cliques → views de página)
- TX Página → Checkout
- TX Checkout → Compra
- % OB / Upsell / Downsell sobre vendas FRONT

**Benchmarks observados:**
- Connect Rate: 85%+ excelente | 75% ok | 60% baixo
- TX Página→Checkout: 10% ótimo | 8% ok | 6% básico
- TX Checkout→Compra: 35%+ excelente | 30% bom | 25% ok | 20% básico

---

### 2. Lançamento Clássico (`lancamento`)

**O que é:** Evento com período definido. Lead entra na base, é aquecido, e compra durante abertura do carrinho.

**Jornada:**
```
Anúncio → Captura (lead gratuito) → Aquecimento → Abertura → Vendas → Fechamento
```

**Fases e métricas por fase:**
| Fase | Métrica principal |
|---|---|
| Distribuição | Alcance, CPM |
| Captação | CPL, volume de leads |
| Lembrete | Frequência (ideal: 2-4x) |
| Vendas | CPA, TX lead→comprador |

---

## Modelos Implementados — Fase 2

### 3. Lançamento Pago (`lancamento_pago`) ✅ IMPLEMENTADO (Ondas 2A/2B/2C)

**Referência:** Metodologia Willian Baldan + debriefings reais observados

**O que é:** O lead **paga** para participar de um evento (ingresso baixo ticket) e durante o evento recebe pitch para comprar o produto principal (alto ticket). O ingresso não é a receita — é uma **qualificação paga**.

> *"Ingressos não são para pagar o tráfego. O objetivo é: cliente é melhor que lead + reduz exposição de caixa na captação."*

**Funil completo — exemplo de referência (valores hipotéticos):**
```
Base própria (~5.000)
        ↓
Tickets vendidos (~800) — ~10% da base
        ↓ OB (~35) — ~4% dos tickets — filtro de intenção
Converteram para produto principal (~80) — ~10% dos tickets
        ↓ + compra direta sem ticket (~10)
Total vendas produto (~90) — ticket médio ~R$1.300
Faturamento total hipotético | ROAS referência: ~3-4x
```

**As 4 fases reais:**

#### Fase 1 — Ingressos
Venda por lotes com preços crescentes. Meta: qualificar compradores, não só vender ingresso.

**Métricas:**
- CAC por ingresso (CPA do ticket)
- Passing diário (ritmo de vendas vs meta)
- Conversão da página de ingressos
- Connect Rate, CTR, CPM
- Distribuição por lote
- TX OB do ingresso (gravação/replay)

**Benchmarks observados:**
- CTR: 1,2% ótimo | 0,9% ok | 0,7% baixo
- CPM: ~R$20 permite escala | ~R$50 média | >R$100 geralmente high ticket
- Lotes abaixo de R$19,90 atraem curiosos — baixa conversão para PL
- Lote R$1,00 não converte para PL (observado: 2,2%)
- Lotes R$19,90-R$34,90 convertem 9-15%

**Fontes de ingresso observadas:**
- Instagram orgânico: ~37%
- Meta Ads: ~37%
- WhatsApp Grupos: ~8%
- WhatsApp API: ~3%
- Indicação: ~6%
- Sem origem: ~9%

**Distribuição de verba observada:**
- Vendas: ~77%
- Distribuição: ~14%
- Remarketing + aquecimento: ~4%
- Outros: ~5%

#### Fase 2 — Comparecimento
Garantir presença no evento. Show rate define o resultado do pitch.

**Métricas:**
- Entrada nos grupos
- Credenciamento
- Abertura de emails (confirmação + aquecimento)
- Rmkt de lembrete
- **Comparecimento total** — 80% excelente | 70% ótimo | 60% ok | 50% baixo

#### Fase 3 — Evento/Pitch
O evento ao vivo com os pitches. Geralmente 2 dias.

**Métricas:**
- Pessoas ao vivo no pitch (Dia 1 vs Dia 2)
- NPS do evento
- Quiz medindo interesse da audiência
- Tempo de tela médio

#### Fase 4 — Vendas e Downsell

**Métricas:**
- TX ticket→comprador PL
- Receita PL vs receita ingresso
- Conversão cashback
- Downsell

**Benchmarks de conversão por ticket observados:**
- R$600-997: 15-20%
- R$1.100-1.500: 13-16%
- R$1.600-2.000: 10-13%
- R$3.000: ~11%
- R$5.000: ~9%
- R$10.000: ~6%

**Insights importantes observados:**

**OB do ingresso é filtro de intenção:**
Quem compra a gravação (OB) converte 2x mais para o PL (20% vs 9,6%).
Não é só receita extra — é qualificação de comprador.

**Tempo entre ticket e PL:**
- Média observada: 10 dias | Mediana: 22 dias
- Semana 1 converte mais (15,5%) vs semanas seguintes (7-8%)
- Early bird qualifica — ativar base antes da abertura gera melhores compradores

**Canal com maior conversão para PL:**
- WhatsApp Grupos: 27,9% (mas só 8% do volume — escalar é a maior alavanca)
- Instagram: 9,6%
- Meta Ads: 8,7%

**Criativos:**
- Vídeo converte mais que imagem para PL
- Imagem vende ticket mas não qualifica para PL
- CPA baixo no pixel ≠ qualidade — validar sempre pela UTM da Hotmart

**Atribuição Pixel vs UTM Hotmart:**
- Pixel atribui mais (viés de visualização)
- UTM Hotmart é mais confiável (clique direto)
- ROAS pelo pixel: ~2,0x | ROAS pela UTM: ~0,9x (o real)
- Diferença típica: 15-30% a menos pela UTM

**Abas de análise que o Cubo precisa ter para este modelo:**
1. Vendas Ticket (passing diário, faixa de preço, origem, horário)
2. Vendas PL (conversão, origem, horário, produto)
3. Ticket × PL (tempo entre compras, perfil do comprador)
4. Pesquisa (dados qualitativos cruzados com vendas)
5. Ticket × Pesquisa (perfil por canal de origem)
6. Base CM / Alunas (base própria vs novos)
7. OB × PL (conversão do order bump)
8. Criativos (conversão por criativo, pixel vs UTM)
9. Relatório Final (funil completo + recomendações automáticas)

**ROAS calculado:**
```
ROAS = Receita TOTAL (ingressos + PL + OBs + downsell) / Investimento Meta
```

---

### 3.1 Lançamento Pago Recorrente — Conceito de Edições ✅

> Implementado nas Ondas 2A/2B/2C (sessões 29–32).

#### O que é uma Edição

Na prática, o lançamento pago raramente acontece uma única vez.
O produtor repete o ciclo — mesma estrutura, mesmas campanhas, mesma página —
ajustando datas, preços e pequenos detalhes a cada repetição.

Cada repetição do ciclo é uma **Edição** (também chamada de "Turma").

```
Funil: "Meu Lançamento Pago"
  └── Edição 1 (jan/2026) — evento 15/01 · início 02/01
  └── [intervalo variável — dias ou semanas]
  └── Edição 2 (fev/2026) — evento 15/02 · início 03/02
  └── [intervalo variável]
  └── Edição 3 (mar/2026) — evento 15/03 · início 24/02
```

#### Regras importantes

**Preço não continua da edição anterior.**
Cada edição começa com o preço que teve melhor aceite na edição anterior —
que pode ser menor, igual ou maior. É uma decisão estratégica, não continuidade automática.

**Intervalo entre edições é variável e intencional.**
Pode ser 2 dias, pode ser 3 semanas. Depende dos resultados da edição anterior
e da estratégia do produtor. O Cubo não pode inferir edições por continuidade
de vendas — precisa de datas explícitas cadastradas pelo usuário.

**Mesma oferta, preços e datas diferentes por edição.**
O `provider_offer_id` do ingresso é o mesmo em todas as edições.
Sem o conceito de edição, o banco mistura todas as vendas num único bloco indistinguível.

#### Análise por edição

**Fase de ingressos = análise de perpétuo com data de fim.**
Dentro de cada edição, a análise da fase de ingressos é idêntica ao funil perpétuo:
- TX clique → página → checkout → compra (diária)
- TX de cada Order Bump (diária)
- Passing diário vs meta
- Ajuste de preço e copy baseado em dados em tempo real

**O que é exclusivo de cada edição:**
- ROAS total (ingressos + produto principal + OBs + downsell)
- Show rate (% de compradores que compareceram ao evento)
- TX ingresso → produto principal
- Preço inicial escolhido e estrutura de lotes

**Comparativo entre edições:**
- Qual edição teve melhor ROAS?
- Qual preço inicial teve mais aceite?
- Show rate melhorou ou piorou?
- TX ingresso→produto evoluiu?

#### Nomenclatura no produto

Usar linguagem natural do mercado de infoprodutos:
- ✅ "Edição" ou "Turma" — naturais e reconhecíveis
- ✅ "Ciclo" — alternativa neutra
- ❌ "Instância", "iteration", "run" — termos técnicos, evitar

#### Implicação arquitetural — DECISÃO PENDENTE

O conceito de edição muda como `phase_id` deve funcionar na Onda 2.
Não basta ligar `offer_mappings.phase_id → launch_phases.id` —
precisa de uma camada que identifique a edição.

**Opções em análise:**
- **Opção A:** nova tabela `launch_editions` com `funnel_id`, `edition_start`, `edition_end`, `event_date` — mais correto, mais esforço
- **Opção B:** campo `edition_label` (text) em `launch_phases` — ex: "Jan/2026" — mais simples, rápido
- **Opção C:** date range das fases para agrupar edições — sem schema change, menos confiável

⚠️ **Não executar Onda 2 antes de definir esta abordagem.**


### 4. Lançamento Meteórico (`lancamento_meteorico`)

**Criado por:** Talles Quinderé

**O que é:** Venda concentrada via WhatsApp/Telegram em 3-7 dias.
Gatilhos: Antecipação → Pertencimento → Escassez.

**Métricas críticas:**
- Custo por entrada no grupo
- Taxa de engajamento no grupo
- TX grupo→comprador
- Velocidade de caixa (receita/dias)

**Oportunidade no Cubo:** integração com Evolution API já existente pode trazer métricas de engajamento direto no painel.

---

### 5. Assinatura / Recorrência (`assinatura`)

**Métricas centrais:**
- MRR (Monthly Recurring Revenue)
- Churn rate mensal
- LTV = Ticket médio / Churn rate mensal
- CPA por assinante

---

### 6. High Ticket com Aplicação (`high_ticket`)

**Jornada:**
```
Anúncio/Orgânico → Formulário de aplicação → Análise → Call de vendas → Fechamento
```

**Métricas críticas:**
- CPA por aplicação
- TX aplicação → aprovada
- TX call → fechamento (referência: 10-15% em eventos com 500+ pessoas)
- Ciclo médio de fechamento

---

## Modelos Auxiliares e Arquitetura Lego

### Filosofia: Modelo Base + Módulos Opcionais

Os modelos não são engessados — cada um tem **módulos opcionais** que podem ser
ativados sem mudar a natureza do funil. Módulos que mudam a natureza viram um novo modelo.

**Perpétuo — módulos opcionais:**
```
[Isca digital] → Página de vendas → [Formulário pré-checkout] → Checkout → Compra
    opcional                               opcional
```
- Isca: lead recebe material gratuito antes de ver a oferta
- Formulário pré-checkout: qualifica o lead antes do preço (combina com CRM + automações)

**Lançamento Pago — módulos opcionais:**
```
Ingressos → [Single Shot] → Comparecimento → Evento → Vendas
                opcional
```
- Single Shot: oferta relâmpago no penúltimo lote, direto ao checkout
- Cada OB do ingresso é opcional (até 3)
- Cashback é opcional na fase de vendas

> Módulos têm **posição definida** — o formulário sempre vai antes do checkout,
> nunca depois. O wizard do Cubo não oferece qualquer peça em qualquer lugar.

### Perpétuo com Isca Digital (`perpetuo_isca`)
Lead pega isca gratuita antes de ver a oferta.

### Perpétuo com Quiz (`perpetuo_quiz`)
Quiz qualifica e direciona para oferta adequada.

### Perpétuo com Formulário Pré-Checkout (`perpetuo_formulario`)
Formulário como barreira de qualificação antes do preço.
Combinado com CRM e automações WhatsApp, vira máquina de qualificação.

### Lançamento Interno (`lancamento_interno`)
Para a própria base, sem captação nova. Começa no aquecimento.

---

## Como o Cubo usa este documento

### No Wizard de Criação
```
"Como é a jornada do seu lead?"
    ↓
Cubo sugere o modelo e pré-configura:
- Fases com métricas alvo
- ROAS alvo sugerido
- O que analisar em cada fase
- Alertas específicos do modelo
```

### Na IA Analista
A IA conhece o modelo e usa benchmarks como referência:
> *"Para um lançamento pago, comparecimento de 45% está abaixo do observado em outros lançamentos (60-70%). Vale revisar a estratégia de lembrete e credenciamento."*

### No Dashboard
Cada modelo destaca suas métricas mais relevantes:
- **Perpétuo** → ROAS, Connect Rate, TX Checkout
- **Lançamento** → CPL, Fases, TX Lead→Comprador
- **Lançamento Pago** → Passing Diário, Comparecimento, TX Ticket→PL, ROAS Total
- **Meteórico** → Engajamento do grupo, TX Grupo→Comprador
- **Assinatura** → MRR, Churn, LTV
- **High Ticket** → TX Aplicação→Call, TX Call→Fechamento

---

## Próximos passos

- [ ] **Decisão arquitetural:** definir abordagem de Edições (seção 3.1) antes da Onda 2
- [ ] Implementar métricas específicas de lançamento pago (Onda 2) — bloqueado até decisão acima
- [ ] Validar benchmarks com mais lançamentos reais (substituir hipotéticos por dados reais)
- [ ] Explorar integração Evolution API para métricas do meteórico
- [ ] Construir wizard de criação guiado (modelo base + módulos opcionais)
- [ ] Refatorar seletor de funil — único seletor agrupado por família
- [ ] Configurar benchmarks por modelo para a IA analista
- [ ] Documentar bairros restantes: Lançamento Clássico, Meteórico, Perpétuo
