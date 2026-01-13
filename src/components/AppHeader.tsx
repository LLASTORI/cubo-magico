import { useNavigate, useLocation, useParams } from "react-router-dom";
import { 
  LayoutDashboard, 
  BarChart3, 
  Package, 
  Rocket, 
  Settings, 
  Lock, 
  Facebook, 
  ShoppingCart, 
  Search, 
  ChevronDown,
  LogOut,
  CalendarDays,
  Users,
  Workflow,
  MessageCircle,
  Route,
  Kanban,
  Lightbulb,
  ClipboardList,
  FileQuestion
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CuboBrand } from "@/components/CuboLogo";
import { UserAvatar } from "@/components/UserAvatar";
import ProjectSelector from "@/components/ProjectSelector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectModules } from "@/hooks/useProjectModules";
import { useHeaderPermissions } from "@/hooks/useHeaderPermissions";

interface AppHeaderProps {
  pageSubtitle?: string;
  rightContent?: React.ReactNode;
}

export const AppHeader = ({ 
  pageSubtitle,
  rightContent
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectCode } = useParams<{ projectCode: string }>();
  const { signOut } = useAuth();
  const { currentProject } = useProject();
  const { isModuleEnabled } = useProjectModules();
  const { permissions } = useHeaderPermissions();
  
  // Helper for project-scoped navigation
  const navigateToProject = (path: string) => {
    if (projectCode) {
      navigate(`/app/${projectCode}${path}`);
    } else if (currentProject?.public_code) {
      navigate(`/app/${currentProject.public_code}${path}`);
    } else {
      // Fallback to legacy route (will be caught and redirected)
      navigate(path);
    }
  };
  
  // Module checks
  const isCRMModuleEnabled = isModuleEnabled('crm');
  const isMetaAdsModuleEnabled = isModuleEnabled('meta_ads');
  const isInsightsModuleEnabled = isModuleEnabled('insights');

  // Permission checks - combine module status with user permissions
  const canAccessDashboard = permissions.dashboard || permissions.isOwner || permissions.isSuperAdmin;
  const canAccessAnalise = permissions.analise || permissions.isOwner || permissions.isSuperAdmin;
  const canAccessCRM = isCRMModuleEnabled && (permissions.crm || permissions.isOwner || permissions.isSuperAdmin);
  const canAccessAutomacoes = isCRMModuleEnabled && (permissions.automacoes || permissions.isOwner || permissions.isSuperAdmin);
  const canAccessChatAoVivo = isCRMModuleEnabled && (permissions.chat_ao_vivo || permissions.isOwner || permissions.isSuperAdmin);
  const canAccessMetaAds = isMetaAdsModuleEnabled && (permissions.meta_ads || permissions.isOwner || permissions.isSuperAdmin);
  const canAccessOfertas = permissions.ofertas || permissions.isOwner || permissions.isSuperAdmin;
  const canAccessLancamentos = permissions.lancamentos || permissions.isOwner || permissions.isSuperAdmin;
  const canAccessConfiguracoes = permissions.configuracoes || permissions.isOwner || permissions.isSuperAdmin;
  const canAccessInsights = isInsightsModuleEnabled && (permissions.insights || permissions.isOwner || permissions.isSuperAdmin);
  const canAccessPesquisas = isInsightsModuleEnabled && (permissions.pesquisas || permissions.isOwner || permissions.isSuperAdmin);
  const canAccessSocialListening = isInsightsModuleEnabled && (permissions.social_listening || permissions.isOwner || permissions.isSuperAdmin);
  
  const currentPath = location.pathname;
  
  // Check if current page is in various dropdowns (accounting for new URL structure)
  const isInBuscaRapida = currentPath.includes('/busca-rapida') || currentPath.includes('/meta-ads');
  const isInAnalytics = currentPath.includes('/funnel-analysis') || currentPath.includes('/analise-mensal') || currentPath.includes('/launch-dashboard') || currentPath.includes('/undefined-offers');
  const isInCRM = currentPath.includes('/crm') || currentPath.includes('/automations') || currentPath.includes('/whatsapp');
  const isInInsights = currentPath.includes('/insights') || currentPath.includes('/quizzes');
  const isOnDashboard = currentPath.endsWith('/dashboard') || (projectCode && currentPath === `/app/${projectCode}`);
  
  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Get default subtitle based on current route
  const getDefaultSubtitle = () => {
    switch (currentPath) {
      case '/': return 'Visão Geral do Projeto';
      case '/busca-rapida': return 'Busca Rápida - Hotmart';
      case '/meta-ads': return 'Meta Ads';
      case '/funnel-analysis': return 'Análise de Funil';
      case '/analise-mensal': return 'Análise Mensal';
      case '/agencia': return 'Visão da Agência';
      case '/undefined-offers': return 'Ofertas a Definir';
      case '/launch-dashboard': return 'Dashboard de Lançamentos';
      case '/crm': return 'CRM - Jornada do Cliente';
      case '/offer-mappings': return 'Mapeamento de Ofertas';
      case '/insights': return 'Insights';
      default: return 'Projeto ativo';
    }
  };

  // Check if any analytics menu should be visible
  const hasAnyAnalytics = canAccessAnalise || canAccessLancamentos;
  // Check if any CRM submenu should be visible
  const hasAnyCRM = canAccessCRM || canAccessAutomacoes || canAccessChatAoVivo;
  // Check if any Insights submenu should be visible
  const hasAnyInsights = canAccessInsights || canAccessPesquisas || canAccessSocialListening;

  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and Project Info */}
          <div className="flex items-center gap-4">
            <CuboBrand size="md" />
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {currentProject ? currentProject.name : 'Selecione um projeto'}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentProject ? (pageSubtitle || getDefaultSubtitle()) : 'Nenhum projeto selecionado'}
              </p>
            </div>
            <ProjectSelector />
          </div>

            {/* Right side - Navigation */}
            <div className="flex gap-2 items-center">
              {currentProject && (
                <>
                  {/* Visão Geral - only show if has dashboard permission and not on dashboard */}
                  {!isOnDashboard && currentPath !== '/agencia' && canAccessDashboard && (
                    <Button
                      onClick={() => navigateToProject('/dashboard')}
                      variant="outline"
                      className="gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Visão Geral
                    </Button>
                  )}

                {/* Dropdown Busca Rápida */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={isInBuscaRapida ? "default" : "outline"} className="gap-2">
                      <Search className="w-4 h-4" />
                      Busca Rápida
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => navigateToProject('/busca-rapida')} 
                      className={`gap-2 cursor-pointer ${currentPath.includes('/busca-rapida') ? 'bg-muted' : ''}`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Hotmart
                    </DropdownMenuItem>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuItem 
                            onClick={() => canAccessMetaAds && navigateToProject('/meta-ads')} 
                            className={`gap-2 ${canAccessMetaAds ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${currentPath.includes('/meta-ads') ? 'bg-muted' : ''}`}
                            disabled={!canAccessMetaAds}
                          >
                            {canAccessMetaAds ? (
                              <Facebook className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                            Meta Ads
                            {!canAccessMetaAds && <Lock className="w-3 h-3 ml-auto" />}
                          </DropdownMenuItem>
                        </TooltipTrigger>
                        {!canAccessMetaAds && (
                          <TooltipContent side="right">
                            <p>{!isMetaAdsModuleEnabled ? 'Módulo não ativado' : 'Sem permissão de acesso'}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Dropdown Análises - only show if has any analytics permission */}
                {hasAnyAnalytics && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant={isInAnalytics ? "default" : "outline"} className="gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Análises
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {canAccessAnalise && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => navigateToProject('/funnel-analysis')} 
                            className={`gap-2 cursor-pointer ${currentPath.includes('/funnel-analysis') ? 'bg-muted' : ''}`}
                          >
                            <BarChart3 className="w-4 h-4" />
                            Análise de Funil
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => navigateToProject('/analise-mensal')} 
                            className={`gap-2 cursor-pointer ${currentPath.includes('/analise-mensal') ? 'bg-muted' : ''}`}
                          >
                            <CalendarDays className="w-4 h-4" />
                            Índices Mensais
                          </DropdownMenuItem>
                        </>
                      )}
                      {canAccessLancamentos && (
                        <DropdownMenuItem 
                          onClick={() => navigateToProject('/launch-dashboard')} 
                          className={`gap-2 cursor-pointer ${currentPath.includes('/launch-dashboard') ? 'bg-muted' : ''}`}
                        >
                          <Rocket className="w-4 h-4" />
                          Lançamentos
                        </DropdownMenuItem>
                      )}
                      {canAccessAnalise && (
                        <DropdownMenuItem 
                          onClick={() => navigateToProject('/undefined-offers')} 
                          className={`gap-2 cursor-pointer ${currentPath.includes('/undefined-offers') ? 'bg-muted' : ''}`}
                        >
                          <Package className="w-4 h-4" />
                          A Definir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Dropdown Análises locked - show if no analytics permission */}
                {!hasAnyAnalytics && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="gap-2 opacity-60 cursor-not-allowed"
                          disabled
                        >
                          <Lock className="w-4 h-4" />
                          Análises
                          <Lock className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sem permissão de acesso</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* CRM Dropdown - only show if has any CRM permission */}
                {hasAnyCRM && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant={isInCRM ? "default" : "outline"} className="gap-2">
                        <Users className="w-4 h-4" />
                        CRM
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {canAccessCRM && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => navigateToProject('/crm')} 
                            className={`gap-2 cursor-pointer ${currentPath.includes('/crm') && !currentPath.includes('/crm/') ? 'bg-muted' : ''}`}
                          >
                            <Route className="w-4 h-4" />
                            Jornada do Cliente
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => navigateToProject('/crm/kanban')} 
                            className={`gap-2 cursor-pointer ${currentPath.includes('/crm/kanban') ? 'bg-muted' : ''}`}
                          >
                            <Kanban className="w-4 h-4" />
                            Pipeline de Vendas
                          </DropdownMenuItem>
                        </>
                      )}
                      {canAccessAutomacoes && (
                        <DropdownMenuItem 
                          onClick={() => navigateToProject('/automations')} 
                          className={`gap-2 cursor-pointer ${currentPath.includes('/automations') ? 'bg-muted' : ''}`}
                        >
                          <Workflow className="w-4 h-4" />
                          Automações
                        </DropdownMenuItem>
                      )}
                      {canAccessChatAoVivo && (
                        <DropdownMenuItem 
                          onClick={() => navigateToProject('/whatsapp')} 
                          className={`gap-2 cursor-pointer ${currentPath.includes('/whatsapp') ? 'bg-muted' : ''}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Chat ao Vivo
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* CRM locked - show if module disabled or no permissions */}
                {!hasAnyCRM && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="gap-2 opacity-60 cursor-not-allowed"
                          disabled
                        >
                          <Lock className="w-4 h-4" />
                          CRM
                          <Lock className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{!isCRMModuleEnabled ? 'Módulo não ativado' : 'Sem permissão de acesso'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Insights Dropdown - only show if has any insights permission */}
                {hasAnyInsights && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant={isInInsights ? "default" : "outline"} className="gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Insights
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {canAccessPesquisas && (
                        <DropdownMenuItem 
                          onClick={() => navigateToProject('/insights/surveys')} 
                          className={`gap-2 cursor-pointer ${currentPath.includes('/insights/surveys') ? 'bg-muted' : ''}`}
                        >
                          <ClipboardList className="w-4 h-4" />
                          Pesquisas
                        </DropdownMenuItem>
                      )}
                      {canAccessInsights && (
                        <DropdownMenuItem 
                          onClick={() => navigateToProject('/quizzes')} 
                          className={`gap-2 cursor-pointer ${currentPath.includes('/quizzes') ? 'bg-muted' : ''}`}
                        >
                          <FileQuestion className="w-4 h-4" />
                          Quizzes
                        </DropdownMenuItem>
                      )}
                      {canAccessSocialListening && (
                        <DropdownMenuItem 
                          onClick={() => navigateToProject('/insights/social')} 
                          className={`gap-2 cursor-pointer ${currentPath.includes('/insights/social') ? 'bg-muted' : ''}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Social Listening
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Insights locked - show if module disabled or no permissions */}
                {!hasAnyInsights && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="gap-2 opacity-60 cursor-not-allowed"
                          disabled
                        >
                          <Lock className="w-4 h-4" />
                          Insights
                          <Lock className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{!isInsightsModuleEnabled ? 'Módulo não ativado' : 'Sem permissão de acesso'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Mapeamento de Ofertas */}
                {canAccessOfertas ? (
                  <Button
                    onClick={() => navigateToProject('/offer-mappings')}
                    variant={currentPath.includes('/offer-mappings') ? "default" : "outline"}
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Ofertas
                  </Button>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="gap-2 opacity-60 cursor-not-allowed"
                          disabled
                        >
                          <Lock className="w-4 h-4" />
                          Ofertas
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sem permissão de acesso</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}

            {/* Extra content (like refresh button) */}
            {rightContent}

            {/* User actions */}
            <UserAvatar size="sm" />
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;