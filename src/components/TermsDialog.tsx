import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Clock, ScrollText } from 'lucide-react';

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: (data: { scrolledToEnd: boolean; timeSpentSeconds: number }) => void;
  mode?: 'view' | 'accept';
}

export const TermsDialog = ({ 
  open, 
  onOpenChange, 
  onAccept,
  mode = 'view' 
}: TermsDialogProps) => {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [acceptChecked, setAcceptChecked] = useState(false);
  const [startTime] = useState(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setScrolledToEnd(false);
      setAcceptChecked(false);
    }
  }, [open]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight;
    
    // Consider scrolled to end when at 95% or more
    if (scrollPercentage >= 0.95) {
      setScrolledToEnd(true);
    }
  };

  const handleAccept = () => {
    const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
    onAccept?.({ scrolledToEnd, timeSpentSeconds });
    onOpenChange(false);
  };

  const canAccept = mode === 'accept' ? scrolledToEnd && acceptChecked : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Termos de Uso e Política de Privacidade
          </DialogTitle>
          <DialogDescription>
            Versão 1.0 - Última atualização: Janeiro de 2025
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea 
          className="flex-1 pr-4 max-h-[50vh]" 
          onScrollCapture={handleScroll}
          ref={scrollRef}
        >
          <div className="space-y-6 text-sm text-muted-foreground">
            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">1. Aceitação dos Termos</h3>
              <p>
                Ao criar uma conta e utilizar a plataforma Cubo Mágico ("Plataforma"), você concorda em cumprir 
                e estar vinculado a estes Termos de Uso ("Termos"). Se você não concordar com qualquer parte 
                destes termos, não poderá acessar ou utilizar nossos serviços.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">2. Descrição do Serviço</h3>
              <p>
                A Plataforma Cubo Mágico é uma ferramenta de gestão estratégica de funis de vendas e análise 
                de dados de marketing digital. Os serviços incluem, mas não se limitam a: integração com 
                plataformas de vendas (Hotmart), análise de campanhas de Meta Ads, gestão de CRM e relatórios analíticos.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">3. Responsabilidades do Usuário</h3>
              <p className="mb-2">Ao utilizar a Plataforma, você concorda em:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Fornecer informações verdadeiras, precisas e completas durante o cadastro;</li>
                <li>Manter a confidencialidade de suas credenciais de acesso;</li>
                <li>Não compartilhar seu acesso com terceiros não autorizados;</li>
                <li>Utilizar a Plataforma apenas para fins legais e em conformidade com estes Termos;</li>
                <li>Não tentar acessar áreas restritas ou sistemas não autorizados;</li>
                <li>Respeitar os direitos de propriedade intelectual da Plataforma.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">4. Integração com Terceiros</h3>
              <p>
                A Plataforma integra-se com serviços de terceiros (Hotmart, Meta Ads, etc.). Ao conectar 
                suas contas desses serviços à Plataforma, você autoriza o acesso aos dados necessários 
                para o funcionamento das funcionalidades contratadas. A Plataforma não se responsabiliza 
                por alterações, indisponibilidades ou políticas desses serviços terceiros.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">5. Coleta e Uso de Dados</h3>
              <p className="mb-2">
                Coletamos e processamos os seguintes tipos de dados:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Dados de cadastro:</strong> nome, email, telefone, informações de perfil;</li>
                <li><strong>Dados de uso:</strong> logs de acesso, interações com a Plataforma;</li>
                <li><strong>Dados de integrações:</strong> informações de vendas, campanhas publicitárias, dados de clientes obtidos através das integrações autorizadas;</li>
                <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, dispositivo utilizado.</li>
              </ul>
              <p className="mt-2">
                Esses dados são utilizados para fornecer e melhorar nossos serviços, gerar relatórios 
                e análises, enviar notificações importantes, e cumprir obrigações legais.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">6. Comunicações via WhatsApp</h3>
              <p>
                Ao fornecer seu número de telefone e optar por receber notificações via WhatsApp, você 
                autoriza o envio de mensagens relacionadas a: alertas de vendas, resumos de desempenho, 
                notificações do projeto, e comunicações importantes sobre sua conta. Você pode desativar 
                essas notificações a qualquer momento nas configurações do seu perfil.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">7. Proteção de Dados</h3>
              <p>
                Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados contra 
                acesso não autorizado, alteração, divulgação ou destruição. Utilizamos criptografia para 
                dados sensíveis e seguimos as melhores práticas de segurança da informação. No entanto, 
                nenhum sistema é 100% seguro.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">8. Limitação de Responsabilidade</h3>
              <p className="mb-2 font-medium text-foreground">
                AVISO IMPORTANTE: A Plataforma Cubo Mágico é fornecida "como está" e "conforme disponível". 
                Em nenhuma circunstância a Plataforma, seus proprietários, diretores, funcionários ou 
                parceiros serão responsáveis por:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Danos diretos, indiretos, incidentais, especiais, consequenciais ou punitivos;</li>
                <li>Perda de lucros, receitas, dados, uso ou outras perdas intangíveis;</li>
                <li>Interrupção de negócios ou perda de oportunidades comerciais;</li>
                <li>Decisões comerciais baseadas nos dados ou análises fornecidos pela Plataforma;</li>
                <li>Erros, imprecisões ou inconsistências nos dados obtidos de integrações de terceiros;</li>
                <li>Falhas de serviços de terceiros integrados (Hotmart, Meta, etc.);</li>
                <li>Acesso não autorizado às suas credenciais por negligência do usuário.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">9. Isenção de Garantias</h3>
              <p>
                A Plataforma não garante que: (a) o serviço atenderá a todos os seus requisitos específicos; 
                (b) o serviço será ininterrupto, pontual, seguro ou livre de erros; (c) os resultados obtidos 
                através do serviço serão precisos ou confiáveis; (d) quaisquer erros serão corrigidos.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">10. Indenização</h3>
              <p>
                Você concorda em defender, indenizar e isentar a Plataforma, seus proprietários, diretores, 
                funcionários e parceiros de todas e quaisquer reivindicações, danos, obrigações, perdas, 
                responsabilidades, custos ou dívidas decorrentes de: (a) seu uso da Plataforma; (b) violação 
                destes Termos; (c) violação de direitos de terceiros.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">11. Propriedade Intelectual</h3>
              <p>
                Todo o conteúdo, design, logos, marcas e propriedade intelectual da Plataforma pertencem 
                exclusivamente à Cubo Mágico. É vedada a reprodução, distribuição ou modificação sem 
                autorização prévia por escrito. Os dados inseridos pelo usuário permanecem de sua propriedade.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">12. Rescisão</h3>
              <p>
                Podemos suspender ou encerrar seu acesso à Plataforma a qualquer momento, com ou sem motivo, 
                com ou sem aviso prévio. Você pode encerrar sua conta a qualquer momento. Após o encerramento, 
                seus dados poderão ser excluídos conforme nossa política de retenção de dados.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">13. Modificações dos Termos</h3>
              <p>
                Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações entrarão 
                em vigor imediatamente após sua publicação. Quando houver alterações significativas que 
                requeiram novo aceite, você será notificado e precisará aceitar os novos termos para 
                continuar usando a Plataforma.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">14. Legislação Aplicável</h3>
              <p>
                Estes Termos serão regidos e interpretados de acordo com as leis da República Federativa 
                do Brasil, incluindo a Lei Geral de Proteção de Dados (LGPD). Qualquer disputa será 
                resolvida no foro da comarca de São Paulo, SP, com exclusão de qualquer outro.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground mb-2">15. Contato</h3>
              <p>
                Para questões relacionadas a estes Termos ou sobre proteção de dados, entre em contato 
                através dos canais oficiais de suporte disponíveis na Plataforma.
              </p>
            </section>

            <section className="border-t pt-4">
              <p className="text-xs">
                Ao clicar em "Criar Conta" e marcar a caixa de aceite dos termos, você confirma que leu, 
                compreendeu e concorda integralmente com estes Termos de Uso e Política de Privacidade.
              </p>
            </section>
          </div>
        </ScrollArea>

        {mode === 'accept' && (
          <DialogFooter className="flex-col gap-4 sm:flex-col">
            {/* Scroll indicator */}
            <div className={`flex items-center gap-2 text-sm ${scrolledToEnd ? 'text-green-600' : 'text-muted-foreground'}`}>
              {scrolledToEnd ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Você leu todo o documento</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Role até o final para aceitar os termos</span>
                </>
              )}
            </div>

            {/* Accept checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="accept-terms-checkbox"
                checked={acceptChecked}
                onCheckedChange={(checked) => setAcceptChecked(checked === true)}
                disabled={!scrolledToEnd}
              />
              <label
                htmlFor="accept-terms-checkbox"
                className={`text-sm cursor-pointer ${!scrolledToEnd ? 'text-muted-foreground' : ''}`}
              >
                Li e compreendi os Termos de Uso e Política de Privacidade e concordo integralmente
              </label>
            </div>

            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAccept} disabled={!canAccept}>
                Aceitar Termos
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};