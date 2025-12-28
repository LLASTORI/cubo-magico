import React from 'react';
import { CuboBrand } from '@/components/CuboLogo';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <CuboBrand size="md" />
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Termos de Serviço</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma Cubo Mágico ("Plataforma"), você concorda em cumprir 
              e estar vinculado a estes Termos de Serviço. Se você não concordar com qualquer parte 
              destes termos, não deverá utilizar nossa Plataforma.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Descrição do Serviço</h2>
            <p>
              O Cubo Mágico é uma plataforma de análise de marketing e gerenciamento de funis de vendas 
              que oferece:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Análise e visualização de métricas de campanhas publicitárias</li>
              <li>Integração com plataformas de anúncios (Meta Ads)</li>
              <li>Integração com plataformas de vendas (Hotmart)</li>
              <li>Gerenciamento de CRM e contatos</li>
              <li>Criação e sincronização de públicos personalizados</li>
              <li>Automação de marketing via WhatsApp</li>
              <li>Análise de funis de vendas e lançamentos</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Cadastro e Conta</h2>
            <p>
              Para utilizar a Plataforma, você deve:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ter pelo menos 18 anos de idade</li>
              <li>Fornecer informações verdadeiras, completas e atualizadas</li>
              <li>Manter a confidencialidade de suas credenciais de acesso</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta</li>
            </ul>
            <p>
              Você é responsável por todas as atividades realizadas em sua conta.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Uso Aceitável</h2>
            <p>
              Ao utilizar nossa Plataforma, você concorda em:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Utilizar a Plataforma apenas para fins legais e de acordo com estes Termos</li>
              <li>Não violar leis ou regulamentos aplicáveis</li>
              <li>Não interferir ou interromper a integridade ou desempenho da Plataforma</li>
              <li>Não tentar obter acesso não autorizado a sistemas ou dados</li>
              <li>Não transmitir conteúdo malicioso, difamatório ou ilegal</li>
              <li>Respeitar os direitos de propriedade intelectual de terceiros</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Integrações com Terceiros</h2>
            <p>
              Nossa Plataforma se integra com serviços de terceiros, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Meta (Facebook/Instagram):</strong> Para acesso a dados de campanhas publicitárias e criação de públicos</li>
              <li><strong>Hotmart:</strong> Para sincronização de dados de vendas e transações</li>
              <li><strong>WhatsApp (via Evolution API):</strong> Para automação de mensagens</li>
            </ul>
            <p>
              O uso dessas integrações está sujeito aos termos de serviço de cada plataforma. 
              Você é responsável por garantir que possui as autorizações necessárias para 
              utilizar essas integrações.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Propriedade Intelectual</h2>
            <p>
              A Plataforma e todo o seu conteúdo, recursos e funcionalidades são de propriedade 
              do Cubo Mágico e estão protegidos por leis de direitos autorais, marcas registradas 
              e outras leis de propriedade intelectual.
            </p>
            <p>
              Você mantém todos os direitos sobre os dados que você insere na Plataforma.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Privacidade e Proteção de Dados</h2>
            <p>
              Sua privacidade é importante para nós. O tratamento de seus dados pessoais é regido 
              por nossa{' '}
              <Link to="/privacy-policy" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
              , que faz parte integrante destes Termos.
            </p>
            <p>
              Você é responsável por garantir que possui base legal para processar dados de 
              terceiros (como contatos de CRM) em nossa Plataforma.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Limitação de Responsabilidade</h2>
            <p>
              Na extensão máxima permitida por lei:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>A Plataforma é fornecida "como está" e "conforme disponível"</li>
              <li>Não garantimos que a Plataforma será ininterrupta ou livre de erros</li>
              <li>Não somos responsáveis por danos indiretos, incidentais ou consequenciais</li>
              <li>Não somos responsáveis por ações de plataformas de terceiros</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Indenização</h2>
            <p>
              Você concorda em indenizar e isentar o Cubo Mágico de quaisquer reclamações, 
              danos, perdas e despesas decorrentes de:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Seu uso da Plataforma</li>
              <li>Violação destes Termos</li>
              <li>Violação de direitos de terceiros</li>
              <li>Dados que você processa através da Plataforma</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Suspensão e Encerramento</h2>
            <p>
              Podemos suspender ou encerrar seu acesso à Plataforma a qualquer momento, 
              sem aviso prévio, por qualquer motivo, incluindo violação destes Termos.
            </p>
            <p>
              Você pode encerrar sua conta a qualquer momento através das configurações 
              da Plataforma ou solicitando a exclusão de seus dados conforme nossa{' '}
              <Link to="/data-deletion" className="text-primary hover:underline">
                página de exclusão de dados
              </Link>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Alterações nos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. 
              Alterações significativas serão comunicadas através da Plataforma ou por e-mail. 
              O uso continuado da Plataforma após tais alterações constitui aceitação dos 
              novos Termos.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">12. Lei Aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. 
              Qualquer disputa será resolvida no foro da comarca de São Paulo, SP.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">13. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos de Serviço, entre em contato conosco através 
              da própria Plataforma ou pelos canais de suporte disponíveis.
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

export default TermsOfService;
