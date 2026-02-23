# Changelog Interno

## 2026-02-23

### Segurança e dependências
- Atualizado `react-router-dom` para `^7.13.0` para incluir correções de segurança no roteador interno.
- Atualizado `vite` para `^7.3.1` para usar cadeia de build com `esbuild` corrigido.
- Atualizado `jspdf` para `^4.2.0` e `jspdf-autotable` para `^5.0.7` (versões compatíveis entre si).

### Fluxo de geração de PDF
- Nenhum ajuste de API foi necessário no código atual (`new jsPDF(...)`, `setFont`, `text` e integração com `jspdf-autotable`) após a atualização.
