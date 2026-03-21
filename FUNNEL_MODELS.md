# FUNNEL_MODELS.md — Modelos de Funis do Cubo Mágico

> Documento de referência estratégica. Base para o wizard de criação, IA analista e campo `funnel_model`.
> Os benchmarks aqui são **referências observadas em lançamentos reais** — não regras absolutas.
> O "jeito do Cubo" será construído gradualmente com mais dados ao longo do tempo.
> Referência principal: metodologia Willian Baldan (@willianbaldan) + debriefings reais
> Última atualização: 20/03/2026

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

## Modelos Novos (a implementar)

### 3. Lançamento Pago (`lancamento_pago`) ⭐ PRIORIDADE 1

**Referência:** Metodologia Willian Baldan + debriefing real "Posicionamento Lucrativo" (março/2026)

**O que é:** O lead **paga** para participar de um evento (ingresso baixo ticket) e durante o evento recebe pitch para comprar o produto principal (alto ticket). O ingresso não é a receita — é uma **qualificação paga**.

> *"Ingressos não são para pagar o tráfego. O objetivo é: cliente é melhor que lead + reduz exposição de caixa na captação."*

**Funil completo observado em lançamento real:**
```
Base própria (5.035)
        ↓
Tickets vendidos (782) — 9,9% da base
        ↓ OB Gravação (32) — 4,1% dos tickets — filtro de intenção
Converteram para PL (77) — 9,9% dos tickets
        ↓ + PL direto sem ticket (12)
Total vendas PL (89) — ticket médio R$1.343
Faturamento total: R$135.824 | Investimento: R$37.775 | ROAS: 3,6x
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

## Modelos Auxiliares

### Perpétuo com Isca Digital (`perpetuo_isca`)
Lead pega isca gratuita antes de ver a oferta.

### Perpétuo com Quiz (`perpetuo_quiz`)
Quiz qualifica e direciona para oferta adequada.

### Perpétuo com Formulário Pré-Checkout (`perpetuo_formulario`)
Formulário como barreira de qualificação antes do preço.

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

- [ ] Validar benchmarks com mais lançamentos reais
- [ ] Implementar métricas específicas de lançamento pago (Onda 2)
- [ ] Explorar integração Evolution API para métricas do meteórico
- [ ] Construir wizard de criação guiado
- [ ] Configurar benchmarks por modelo para a IA analista
