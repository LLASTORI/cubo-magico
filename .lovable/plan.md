
Objetivo imediato
- Aplicar a correção que você aprovou: na geração do access_token da Hotmart, enviar APENAS:
  - Header: `Authorization: Basic {basic}` (normalizado para não duplicar “Basic ”)
  - Body (x-www-form-urlencoded): somente `grant_type=client_credentials`
- Não tocar em vendas/webhook/ledger/CSV/orders e não mudar endpoints de Produtos/Ofertas.

Diagnóstico do problema (por que essa correção é válida)
- Hoje o código do backend function `hotmart-products` envia as credenciais de duas formas ao mesmo tempo:
  1) `Authorization: Basic ...` (header)
  2) `client_id` + `client_secret` (no body)
- Isso é diferente do fluxo obrigatório que você descreveu (e do padrão mais comum em “client credentials” quando se usa Basic): quando se autentica via Basic no header, o body fica só com `grant_type`.
- Na prática, isso pode gerar 401/unauthorized principalmente quando:
  - o usuário atualiza o campo “Basic” (ou o “Client Secret”) em momentos diferentes e os valores ficam inconsistentes entre si;
  - o header e o body passam a “discordar” (mesmo que ambos pareçam válidos isoladamente).
- Ao remover `client_id` e `client_secret` do body, eliminamos a ambiguidade: a Hotmart passa a validar apenas o Basic (que é exatamente o que a Hotmart fornece no painel).

O que será alterado (escopo mínimo)
Arquivo: `supabase/functions/hotmart-products/index.ts`

Mudança 1 — tokenBody (a correção aprovada)
- Antes (atual):
  - `tokenBody = { grant_type, client_id, client_secret }`
- Depois:
  - `tokenBody = { grant_type }` apenas

Mudança 2 — melhorar a mensagem de erro do token (para ficar “status + body”)
- Hoje o erro retornado para o frontend perde o status (ele só loga no console da função).
- Vamos ajustar o `throw new Error(...)` para incluir `(${response.status})` + trecho do body (limitado), ficando alinhado com seu requisito de “mensagem técnica clara (status + body)”.
- Isso não muda comportamento de integração, só melhora o diagnóstico no UI.

Sequência de implementação (quando você aprovar)
1) Editar `getAccessToken()`:
   - Trocar:
     - `new URLSearchParams({ grant_type: 'client_credentials', client_id: ..., client_secret: ... })`
   - Por:
     - `new URLSearchParams({ grant_type: 'client_credentials' })`
2) Manter a normalização já existente do Basic:
   - Se vier “Basic ...”, remover o prefixo antes de montar o header final.
3) Ajustar a mensagem de erro do token para incluir status + body (truncado):
   - Ex.: `Falha na autenticação (401): {body...}`
4) Não alterar endpoints já corretos:
   - Produtos: `GET https://developers.hotmart.com/products/api/v1/products`
   - Ofertas: `GET https://developers.hotmart.com/products/api/v1/products/:ucode/offers`
5) Validar pelo fluxo existente da UI:
   - Em Configurações → Integrações → Hotmart → “Testar API”
   - Esperado: token OK → chamada de produtos OK → mensagem de sucesso.

Critérios de aceite (como saber que ficou correto)
- Ao testar, o backend function deve:
  - Conseguir obter `access_token` sem 401.
  - Conseguir chamar `GET /products/api/v1/products` com Bearer.
- Em caso de erro, a UI deve mostrar algo do tipo:
  - “Falha na autenticação (401): …” (com body retornado pela Hotmart)

Observações importantes (sem executar nada extra)
- Essa correção respeita exatamente seu fluxo obrigatório (Basic no header + grant_type no body) e mantém o modelo de 3 campos na UI.
- Se mesmo após isso continuar 401, a próxima hipótese mais provável será credencial inválida/revogada no painel Hotmart, ou Basic colado com caracteres invisíveis (quebra de linha). Mas primeiro precisamos eliminar a ambiguidade técnica do request.

Arquivos envolvidos
- Editar: `supabase/functions/hotmart-products/index.ts`
- Nenhuma mudança em tabelas, RLS, vendas/webhooks/ledger/CSV/orders.

Plano de rollback (se precisar)
- Reverter apenas a alteração do `tokenBody` e da mensagem de erro no mesmo arquivo (sem impactos em outras partes).
