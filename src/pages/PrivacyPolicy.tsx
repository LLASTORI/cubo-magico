import React from 'react';
import { CuboBrand } from '@/components/CuboLogo';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <CuboBrand size="md" />
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Introdução</h2>
            <p>
              A Cubo Mágico ("nós", "nosso" ou "nossa") valoriza a privacidade de nossos usuários. 
              Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos 
              suas informações pessoais quando você utiliza nossa plataforma de análise de marketing 
              e gerenciamento de funis de vendas.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Informações que Coletamos</h2>
            <p>Coletamos os seguintes tipos de informações:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Informações de conta:</strong> Nome, endereço de e-mail e credenciais de acesso 
                quando você cria uma conta.
              </li>
              <li>
                <strong>Dados de integrações:</strong> Informações de contas de anúncios do Meta (Facebook/Instagram), 
                incluindo métricas de campanhas, conjuntos de anúncios e anúncios.
              </li>
              <li>
                <strong>Dados de vendas:</strong> Informações de transações provenientes de plataformas 
                como Hotmart, incluindo dados de compradores e métricas de vendas.
              </li>
              <li>
                <strong>Dados de CRM:</strong> Informações de contatos, leads e clientes que você gerencia 
                em nossa plataforma.
              </li>
              <li>
                <strong>Dados de uso:</strong> Informações sobre como você utiliza nossa plataforma, 
                incluindo logs de acesso e interações.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Como Usamos suas Informações</h2>
            <p>Utilizamos suas informações para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fornecer, manter e melhorar nossos serviços</li>
              <li>Processar e exibir análises de marketing e vendas</li>
              <li>Sincronizar dados com plataformas de terceiros (Meta, Hotmart, etc.)</li>
              <li>Criar e gerenciar públicos personalizados para campanhas de marketing</li>
              <li>Enviar notificações importantes sobre sua conta e nossos serviços</li>
              <li>Proteger contra atividades fraudulentas ou não autorizadas</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Compartilhamento de Dados</h2>
            <p>
              Compartilhamos suas informações apenas nas seguintes circunstâncias:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Com plataformas integradas:</strong> Para sincronizar dados e criar públicos 
                personalizados (ex: Meta Ads, Hotmart).
              </li>
              <li>
                <strong>Provedores de serviços:</strong> Utilizamos serviços de terceiros para 
                hospedagem, análise e processamento de dados (ex: Supabase).
              </li>
              <li>
                <strong>Requisitos legais:</strong> Quando exigido por lei ou para proteger 
                nossos direitos legais.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Integrações com Meta (Facebook/Instagram)</h2>
            <p>
              Nossa plataforma se integra com a API do Meta para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acessar métricas de campanhas publicitárias</li>
              <li>Criar e gerenciar públicos personalizados (Custom Audiences)</li>
              <li>Sincronizar dados de contatos para segmentação de anúncios</li>
            </ul>
            <p>
              Os dados compartilhados com o Meta são processados de acordo com a 
              <a href="https://www.facebook.com/privacy/policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer"> Política de Privacidade do Meta</a>.
              Utilizamos hash SHA-256 para proteger dados sensíveis antes do envio.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
              <li>Criptografia de dados sensíveis em repouso</li>
              <li>Controle de acesso baseado em funções (RBAC)</li>
              <li>Autenticação de dois fatores (2FA)</li>
              <li>Monitoramento contínuo de segurança</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Seus Direitos</h2>
            <p>
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou incorretos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar o consentimento para processamento</li>
              <li>Solicitar portabilidade de dados</li>
              <li>Obter informações sobre compartilhamento de dados</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Retenção de Dados</h2>
            <p>
              Mantemos seus dados pelo tempo necessário para fornecer nossos serviços 
              e cumprir obrigações legais. Você pode solicitar a exclusão de sua conta 
              e dados a qualquer momento.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Cookies e Tecnologias Similares</h2>
            <p>
              Utilizamos cookies e tecnologias similares para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Manter sua sessão de login</li>
              <li>Lembrar suas preferências</li>
              <li>Analisar o uso da plataforma para melhorias</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Notificaremos sobre 
              alterações significativas através da plataforma ou por e-mail.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Contato</h2>
            <p>
              Para questões relacionadas à privacidade ou para exercer seus direitos, 
              entre em contato conosco através da própria plataforma ou pelos canais 
              de suporte disponíveis.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">12. Exclusão de Dados</h2>
            <p>
              Você pode solicitar a exclusão de todos os seus dados a qualquer momento. 
              Para isso, acesse as configurações da sua conta ou entre em contato com 
              nosso suporte. A exclusão será processada em até 30 dias úteis.
            </p>
          </section>
        </div>
      </main>
      
      <footer className="border-t border-border/40 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Cubo Mágico. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
