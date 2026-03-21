# VISION.md — Visão do Produto Cubo Mágico

> Download da mente do fundador. Captura de ideias, visões e direções estratégicas.
> Este arquivo NÃO é um backlog de tarefas — é o norte do produto.
> Atualizar sempre que uma nova ideia surgir nas conversas com Claude.ai.
> Última atualização: 21/03/2026

---

## A Visão Central

O Cubo Mágico não é uma ferramenta de dados.
É uma ferramenta de **interpretação de dados**.

A vantagem única: cruzar Meta Ads (antes da venda) com qualquer plataforma de vendas (depois da venda).
Nenhuma ferramenta do mercado faz isso de forma integrada e multi-plataforma.

Mas a visão vai além: o Cubo deve saber **quem é cada pessoa** no funil —
o que ela comentou, o que ela assistiu, o que ela respondeu no quiz —
e usar isso para recomendar a oferta certa, para a pessoa certa, na hora certa.

E para que tudo isso funcione com precisão real, o Cubo precisa de sua própria
camada de tracking independente — sem depender de plataformas como fonte de verdade.
**Quem controla o dado, controla o algoritmo.**

---

## 1. Inteligência de Cliente — A Sacada de Ouro

### O problema que ninguém resolveu
Comentários no Instagram são anônimos. Leads no CRM têm email.
Nunca houve ponte entre comportamento social e identidade de lead.

### A solução do Cubo
Pedir o **@ do Instagram** como campo de captura em quizzes e pesquisas.
É uma chave de identidade **declarada pelo próprio usuário**.

```
Comentário no Instagram (@usuario)
        ↓
Social Listening captura + classifica + salva
        ↓
Quiz/Pesquisa coleta @instagram como campo
        ↓
CRM conecta @instagram → comentários históricos → comportamento
        ↓
Perfil Cognitivo construído por IA
        ↓
Recomendação personalizada por pessoa
```

**Por que é único:** ninguém no mercado pensou em usar o @ como chave de identidade
declarada para conectar comportamento social com CRM.

### O que já existe no Cubo
- Social Listening: captura, salva e classifica comentários do Instagram/Facebook
- Gera respostas adequadas por tipo de comentário via IA (OpenAI gpt-4o-mini)
- Cartão do contato no CRM com aba "Social" para ver comentários vinculados
- Campo `@instagram` salvo como chave única no CRM
- Perfil Cognitivo no cartão do contato (em construção)
- Atribuição completa: UTMs + Meta IDs + Insights do Segmento
- Sincronização automática a cada 30 minutos via pg_cron

### Próxima evolução — IA Conversacional por Contato
Cada contato terá um perfil construído a partir de:
- Comentários nas redes sociais
- Respostas em quizzes e pesquisas
- Histórico de compras e interações
- Comportamento no WhatsApp
- Nível de consciência (baseado nos conteúdos que consumiu)

A IA usa esse perfil para:
- Recomendar qual oferta fazer para aquela pessoa
- Sugerir o que o vendedor deve falar
- Identificar o momento ideal para abordar
- Personalizar a comunicação automaticamente

---

## 2. Funis de Distribuição de Conteúdo (Corredor Polonês)

### O que é
Funil de consciência baseado em engajamento de conteúdo — independente dos funis de venda,
mas alimenta perpétuos e lançamentos aumentando o volume de vendas.

### Os 3 tipos de conteúdo

| Tipo | Nome | Objetivo | Métrica Principal |
|---|---|---|---|
| C1 | Atração | Atrair seguidores novos | CPS (custo por seguidor) |
| C2 | Retenção | Engajar quem chegou, aumentar nível de consciência | % views 25/50/75% do vídeo |
| C3 | Autoridade | Top of mind, autoridade, preparar para venda | Comentários, saves, compartilhamentos |

### Como funciona o sequenciamento
```
C1 → assistiu X% → entra no público de C2
C2 → assistiu Y% → entra no público de C3
C3 → engajou → pessoa quente para oferta (perpétuo ou lançamento)
```

O sequenciamento é feito via públicos personalizados no Meta Ads (público de vídeo).
Formatos: principalmente Reels, mas também imagens.

### Limitação
Não é possível rastrear quem individualmente assistiu — apenas métricas agregadas por campanha.
Mas o Cubo pode medir a **saúde do funil de conteúdo** como um todo.

### O que o Cubo poderia mostrar
- C1: CPS, alcance, novos seguidores por período
- C2: ThruPlay (views 25/50/75%), custo por view qualificado
- C3: taxa de engajamento (comentários + saves + compartilhamentos), CPE
- Fluxo: % que migra de C1 → C2 → C3 via tamanho dos públicos
- Correlação: funil de conteúdo saudável → vendas aumentam

### Onde se encaixa
Nova área em Análises: "Funil de Conteúdo" ou dentro de Meta Ads.
`funnel_model = 'conteudo'` — novo valor a adicionar.

---

## 3. Modelos de Funis — Visão Completa

### Já implementados
- `perpetuo` — funil sempre aberto, decisão rápida
- `lancamento` — evento com período definido, lead gratuito antes da compra

### Campo `funnel_model` já no banco (9 valores)
- `lancamento_pago` — ingresso pago + evento + pitch do produto principal
- `meteorico` — venda concentrada via WhatsApp/Telegram em 3-7 dias
- `assinatura` — recorrência mensal/anual, MRR e churn
- `high_ticket` — aplicação + call de vendas, ticket R$5k-50k+
- `custom` — funil personalizado
- A adicionar: `conteudo`, `whatsapp`

### Variações de perpétuo
- `perpetuo_isca` — isca digital antes da oferta
- `perpetuo_quiz` — quiz de qualificação antes da oferta
- `perpetuo_formulario` — formulário pré-checkout

### Filosofia do wizard de criação
Em vez de "qual tipo de funil?", o Cubo pergunta:
> *"Como é a jornada do seu lead?"*
E monta estrutura, fases, métricas e alertas automaticamente.

---

## 4. IA Analista — A Interpretação dos Dados

### O problema atual
Todas as ferramentas mostram dados. Nenhuma diz o que fazer.

### A visão do Cubo
A IA conhece o modelo e usa benchmarks específicos por tipo:

> *"Para um lançamento pago, comparecimento de 45% está abaixo do esperado (60-70%).
> O problema provavelmente está no credenciamento — apenas 20% dos compradores
> entraram no grupo. Revise sua sequência de emails de boas-vindas."*

### O que a IA precisa saber por modelo
- Benchmarks por `funnel_model` e faixa de ticket
- O que é normal, bom e crítico para cada métrica
- Qual fase está causando o problema e o que fazer

---

## 5. Social Listening — Visão Expandida

### O que já existe
- Captura automática de comentários Instagram/Facebook (orgânico + ads)
- Classificação por sentimento e intenção comercial (OpenAI gpt-4o-mini)
- Geração de respostas adequadas por tipo de comentário
- Vinculação de comentários a contatos via @instagram
- Sincronização automática a cada 30 minutos

### Próximas evoluções

**Comentários de anúncios:**
Comentários em ads têm `ad_id` e `adset_id` — permite cruzar com Meta Ads.
Análise: "qual criativo gera mais intenção de compra nos comentários?"

**Detecção de intenção em tempo real:**
"Quanto custa?" → cria tarefa para vendas + dispara automação WhatsApp + adiciona a público de remarketing

**Análise de conteúdo:**
Quais posts geram mais interesse comercial? Quais geram mais reclamações?
Qual tipo de conteúdo produz mais seguidores qualificados (C1 eficiente)?

**Memória de longo prazo:**
"Essa pessoa comentou 3 vezes pedindo informações sobre X nos últimos 30 dias"
→ momento ideal para abordar.

---

## 6. CRM — Visão do Perfil Cognitivo

### O cartão do contato ideal

| Dimensão | Fonte de dados |
|---|---|
| Histórico de compras | Hotmart webhook |
| Nível de consciência | Quizzes + pesquisas |
| Comportamento social | Social Listening + @instagram |
| Engajamento WhatsApp | Evolution API |
| UTM de origem | Tracking independente (ver TRACKING.md) |
| Interações com conteúdo | C1/C2/C3 do corredor polonês |
| Segmento de comportamento | IA baseada em tudo acima |

### O que a IA faz com esse perfil
- **Recomendação de oferta:** "Para essa pessoa, a próxima oferta ideal é X"
- **Sugestão para o vendedor:** "Essa pessoa está pronta, abordar via WhatsApp"
- **Alerta de churn:** "Essa pessoa não interage há 30 dias"
- **Identificação de evangelistas:** "Candidata a afiliada"

---

## 7. Automações — Visão

### O que já existe
- Editor visual de fluxos (nodes + edges)
- Motor de execução + WhatsApp via Evolution API
- Triggers por evento de compra

### Próxima evolução — baseadas em perfil cognitivo
```
Conteúdo (C1/C2/C3) → aumenta consciência
        ↓
Social Listening → detecta intenção
        ↓
Perfil Cognitivo → confirma momento
        ↓
Automação → abordagem personalizada
        ↓
Venda
```

---

## 8. Funil de WhatsApp (Click-to-WhatsApp)

### O que é
Campanha Meta Ads com objetivo "Mensagens" — lead cai direto no WhatsApp.
Sem página de vendas, sem checkout público.

### O que falta para fechar o ciclo

**Fase 1 — Métricas Meta Ads:**
- Custo por conversa iniciada, volume por campanha/criativo

**Fase 2 — Conversão (pode acontecer em qualquer lugar):**
- Plataformas de atendimento com IA (Typebot, ManyChat)
- PIX direto, boleto offline, evento presencial
- Qualquer plataforma que não seja Hotmart

Caminhos: CSV import, webhook genérico, registro manual, ou Hotmart via link.

**Fase 3 — Análise:**
```
Meta Ads → Conversa iniciada → Conversão → ROAS do funil WhatsApp
```

### Métricas únicas
- CPConv (custo por conversa), TX conversa→compra, tempo médio, ROAS

### Status
Não existe. `funnel_model = 'whatsapp'` a adicionar.

---

## 9. Multi-Plataforma — O Cubo Não é Hotmart-Dependente

### A visão
O Cubo é um **white label total** de inteligência de negócios.
Funciona com qualquer plataforma de vendas do mercado.
A Hotmart foi o ponto de partida por ser a mais complexa.

### Por que é viável
- Campo `provider` em `orders` — hoje só `'hotmart'`, mas o campo existe
- `provider_order_id` como chave de idempotência — funciona para qualquer plataforma
- Parser isolado por plataforma — destino canônico é sempre o mesmo
- `tracking_adapter/` por provider — mesmo padrão no tracking (ver TRACKING.md)

### Padrão de integração

| Plataforma | Webhook | CSV | API | Complexidade |
|---|---|---|---|---|
| Hotmart | ✅ | ✅ | ✅ | Alta |
| Kiwify | ✅ | ✅ | Limitada | Média |
| Eduzz | ✅ | ✅ | ✅ | Média |
| Monetizze | ✅ | ✅ | Limitada | Média |
| Braip / Pepper | ✅ | ✅ | — | Baixa |
| Venda manual / PIX | — | ✅ | — | Baixa |
| Webhook genérico | ✅ | — | — | Configurável |

### ROAS real
```
ROAS = Receita total (todas as plataformas) / Investimento Meta Ads
```
Nenhuma ferramenta do mercado faz isso hoje.

### Ordem de implementação
1. Kiwify — segunda maior plataforma do Brasil
2. Eduzz / Monetizze
3. Webhook genérico — aceita qualquer plataforma
4. Venda manual — registro no CRM (offline, PIX, presencial)

### Status
Não implementado. A arquitetura suporta — é questão de criar os parsers.

---

## 10. Tracking Independente — O Cubo Como Fonte de Verdade

### A visão
O Cubo não depende de Meta Ads ou Google Ads para saber de onde veio uma venda.
Ele constrói sua própria camada de identidade, atribuição e validação financeira —
superior ao que qualquer plataforma de anúncios oferece, porque cruza dados de marketing
com receita real validada pelo webhook.

### Por que é inevitável
- Plataformas de anúncios têm viés: querem mostrar ROAS alto
- iOS 14+ quebrou o pixel — atribuição browser-only é insuficiente
- Multi-provider de vendas torna impossível confiar em uma única fonte
- O Cubo já tem o webhook como verdade financeira — falta fechar o loop do tracking

### Os 3 IDs do sistema

| ID | Papel |
|---|---|
| `cubo_session_id` | Sessão de marketing — conecta clique → venda |
| `cubo_user_id` | Jornada do usuário — conecta múltiplas sessões |
| `event_id` | Deduplicação — garante 1 venda = 1 conversão |

### O SCK v2 — DNA do marketing
String estruturada e versionada que carrega contexto completo de origem.
Funciona em todos os providers. Não depende de UTMs ou campos proprietários.
```
v2|src=facebook|med=cpc|cmp=campanha|sid=session_id|pg=home
```

### Hierarquia de confiança
```
Browser > Provider > Inferência
```
Espelho exato do financeiro: `Webhook > API > CSV`

### Confidence Model
Cada venda recebe um score de atribuição (0 a 1).
O Cubo separa ROAS bruto de ROAS confiável — decisões só com dados de alta confiança.

### Roadmap (5 fases)
```
Fase 1 — Tracking base (session_id + SCK v2 + tracking_sessions)
Fase 2 — Atribuição (tracking_touches + Canonical Tracking Model)
Fase 3 — Confidence (scoring + ROAS confiável + deduplicação)
Fase 4 — Reverse CAPI (envia conversões reais para Meta/Google)
Fase 5 — Decision Engine (regras de tráfego automatizadas)
```

> **Documentação completa:** `TRACKING.md`

---

## 11. Cubo Guia — O Produto Sabe Mais Que o Usuário

### O problema que nenhuma ferramenta resolve
Ferramentas mostram dados. Nenhuma orienta quem não sabe o que fazer.
No mercado de infoprodutos brasileiro, é muito comum que produtores façam lançamentos
"do jeito que aprenderam" — sem cronograma, sem benchmarks, esquecendo etapas críticas.
O Cubo pode resolver isso em três camadas:

**Camada 1 — Lembra o que o usuário esquece**
Cronograma automático reverso a partir da data do evento.
Alertas de fase: *"Faltam 3 dias para a virada de lote — ative os ads de escassez."*
Checklist por modelo: o que configurar antes de abrir cada fase.

**Camada 2 — Ensina o que o usuário não sabe**
Quando alguém cria um lançamento pago pela primeira vez, o Cubo entrega:
- Mapa visual da jornada completa com todas as fases
- Estratégias incrementais (Single Shot, pressão de virada, anti-no-show)
- Benchmarks do que esperar em cada etapa
- Exemplos do que funciona e do que não funciona

**Camada 3 — Detecta padrões sem o usuário precisar configurar**
O Cubo não pede que o usuário "configure" suas estratégias.
Ele lê os dados e detecta automaticamente:
- Pico de vendas 3 dias antes de uma virada = pressão de lote funcionou
- CPA muito abaixo + checkout direto = Single Shot rodando
- Queda brusca no passing = problema na campanha ou na página

### Como funciona na prática
Ao criar um funil com `funnel_model = lancamento_pago` e data do evento:
```
Cubo gera automaticamente:
→ Cronograma reverso semana a semana
→ Checklist de configuração por fase
→ Alertas inteligentes com benchmarks
→ Documento "Como fazer" interativo
→ Passing diário com meta calculada automaticamente
```

### O documento "Como fazer"
Não é um tutorial genérico — é um plano personalizado para aquele lançamento,
com as datas reais, os lotes configurados e as métricas esperadas.
Exportável como PDF ou visualizável dentro do Cubo.

---

## 12. Inteligência Coletiva — O Fosso Competitivo do Cubo

### A visão
Cada lançamento de cada cliente alimenta os benchmarks do Cubo.
Com o tempo, o Cubo sabe mais sobre lançamentos pagos no Brasil
do que qualquer consultor, curso ou ferramenta do mercado.

### O que nenhuma ferramenta tem
Benchmarks próprios construídos com dados reais anonimizados:
- *"Para psicólogos em início de carreira, show rate médio é 67%"*
- *"Lançamentos com Single Shot na semana -2 convertem 23% mais"*
- *"Lotes abaixo de R$19,90 não qualificam para o produto principal"*
- *"WhatsApp Grupos converte 2,8x mais que Meta Ads para o produto principal"*

Não são benchmarks da internet — são benchmarks do **mercado brasileiro de infoprodutos**,
construídos com dados reais dos próprios usuários do Cubo.

### Como os benchmarks evoluem
```
Lançamento A (março/2026) → dados entram no pool
Lançamento B (abril/2026) → pool atualiza
...
1.000 lançamentos → Cubo tem o maior banco de dados de
                    performance de lançamentos do Brasil
```

### Inteligência por nicho
Com volume suficiente, o Cubo segmenta por nicho:
- Saúde (psicólogos, nutricionistas, médicos)
- Educação (concursos, idiomas, graduação)
- Negócios (marketing, vendas, gestão)
- Fitness e bem-estar
- Espiritualidade

*"Para o seu nicho, o show rate médio é X. O seu está em Y — acima da média."*

### Proteção de dados
Todos os benchmarks são calculados de forma anonimizada e agregada.
Nenhum dado individual de cliente é exposto.
O usuário contribui para o pool e se beneficia do pool.

### Status
Não implementado. Depende de volume de usuários e lançamentos.
Arquitetura: views agregadas no Supabase com `project_id` removido.
Prioridade: longo prazo — mas a arquitetura deve suportar desde o início.

---

## 13. Integrações Futuras

| Integração | Por que importa |
|---|---|
| Zoom / WebinarJam | Show rate real de lançamentos pagos |
| Conversions API Meta (CAPI) | Atribuição server-side pós-iOS 14 |
| Google Ads | Ampliar atribuição além do Meta |
| TikTok Ads | Mercado crescendo no Brasil |
| ActiveCampaign / RD Station | Nutrição de leads externa |
| Kiwify / Eduzz / Monetizze | Multi-plataforma de vendas |
| Stape (GTM Server-Side) | Redundância de CAPI — coexiste com Reverse CAPI do Cubo |

---

## 14. Perguntas Abertas

- Como medir impacto do funil de conteúdo nas vendas sem rastreamento individual?
- Qual é o limite ético de personalização baseada em comportamento social?
- Como apresentar o Perfil Cognitivo ao usuário do Cubo (produtor)?
- O wizard de criação de funil deve ser obrigatório ou opcional?
- Como monetizar funcionalidades avançadas de IA (plano premium)?
- Como resolver `cubo_user_id` quando o usuário compra com e-mail diferente do cadastro?
- Qual é o script "oficial" do Cubo para tracking no browser — unificado ou modular?
- O Reverse CAPI deve enviar valor bruto ou líquido para otimização do algoritmo Meta?
- Como estruturar o pool de inteligência coletiva respeitando privacidade e LGPD?
- O "Como fazer" deve ser gerado por IA (dinâmico) ou template fixo por modelo?
- Como segmentar benchmarks por nicho com volume ainda pequeno de usuários?

---

## Como usar este arquivo

1. **Ler antes de planejar** — qualquer nova feature deve se encaixar nessa visão
2. **Atualizar após conversas** — quando uma nova ideia surgir, adicionar aqui
3. **Referenciar no TASKS.md** — tarefas devem apontar para seções deste documento
4. **Compartilhar com o agente no Cursor** — contexto estratégico para decisões técnicas
5. **Para detalhes de tracking** — consultar `TRACKING.md` (arquitetura técnica completa)
