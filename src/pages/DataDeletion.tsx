import React from 'react';
import { CuboBrand } from '@/components/CuboLogo';
import { Link } from 'react-router-dom';
import { Mail, Shield, Clock, CheckCircle } from 'lucide-react';

const DataDeletion = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <CuboBrand size="md" />
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Exclusão de Dados do Usuário</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Seu Direito à Exclusão de Dados</h2>
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD) e as políticas do Meta (Facebook), 
              você tem o direito de solicitar a exclusão de todos os seus dados pessoais armazenados 
              em nossa plataforma a qualquer momento.
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-6 my-8">
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">Dados Protegidos</h3>
              </div>
              <p className="text-sm">
                Todos os seus dados são armazenados de forma segura e criptografada.
              </p>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">Prazo de Processamento</h3>
              </div>
              <p className="text-sm">
                Sua solicitação será processada em até 15 dias úteis.
              </p>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Como Solicitar a Exclusão de Dados</h2>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Opção 1: Através da Plataforma</h3>
                  <p className="text-sm mt-1">
                    Se você ainda tem acesso à sua conta, acesse <strong>Configurações → Conta → Excluir minha conta</strong>. 
                    Isso iniciará o processo de exclusão de todos os seus dados.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Opção 2: Por E-mail</h3>
                  <p className="text-sm mt-1">
                    Envie um e-mail para <a href="mailto:leandrolastori@gmail.com" className="text-primary hover:underline">leandrolastori@gmail.com</a> com 
                    o assunto "Solicitação de Exclusão de Dados" incluindo:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                    <li>Seu nome completo</li>
                    <li>E-mail associado à sua conta</li>
                    <li>Confirmação de que deseja excluir todos os seus dados</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">O Que Será Excluído</h2>
            <p>
              Ao solicitar a exclusão, os seguintes dados serão permanentemente removidos:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Dados da conta:</strong> Nome, e-mail, preferências e configurações
              </li>
              <li>
                <strong>Dados de integrações:</strong> Tokens de acesso, configurações de contas 
                de anúncios e credenciais de API
              </li>
              <li>
                <strong>Dados sincronizados:</strong> Métricas de campanhas, dados de vendas 
                e informações de CRM importadas
              </li>
              <li>
                <strong>Públicos personalizados:</strong> Audiências criadas e sincronizadas 
                com o Meta Ads
              </li>
              <li>
                <strong>Histórico de atividades:</strong> Logs de acesso e registro de ações
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Dados de Terceiros</h2>
            <p>
              Importante: A exclusão de dados na plataforma Cubo Mágico não afeta:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Dados armazenados diretamente nas plataformas de terceiros (Meta, Hotmart, etc.)
              </li>
              <li>
                Públicos já exportados para o Meta Ads (você deve excluí-los diretamente no 
                Gerenciador de Anúncios do Meta)
              </li>
              <li>
                Dados de projetos compartilhados com outros membros da equipe (a menos que 
                você seja o único proprietário)
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Confirmação da Exclusão</h2>
            <p>
              Após o processamento da sua solicitação, você receberá um e-mail de confirmação 
              informando que seus dados foram excluídos permanentemente de nossos sistemas.
            </p>
            <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                A exclusão é irreversível. Todos os dados serão permanentemente removidos 
                e não poderão ser recuperados.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Contato</h2>
            <p>
              Para dúvidas sobre a exclusão de dados ou exercício de outros direitos previstos 
              na LGPD, entre em contato:
            </p>
            <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">E-mail para contato:</p>
                <a href="mailto:leandrolastori@gmail.com" className="text-primary hover:underline">
                  leandrolastori@gmail.com
                </a>
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4">
            <p className="text-sm">
              Para mais informações sobre como tratamos seus dados, consulte nossa{' '}
              <Link to="/privacy-policy" className="text-primary hover:underline">
                Política de Privacidade
              </Link>.
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

export default DataDeletion;
