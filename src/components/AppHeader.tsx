import { useNavigate, useLocation } from "react-router-dom";
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
  Building2,
  Users
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
import { useProjectMembers } from "@/hooks/useProjectMembers";

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
  const { signOut } = useAuth();
  const { currentProject } = useProject();
  const { userRole } = useProjectMembers(currentProject?.id || '');
  
  const canAccessOfferMappings = userRole === 'owner' || userRole === 'manager';
  
  const currentPath = location.pathname;
  
  // Check if current page is in the "Busca Rápida" dropdown
  const isInBuscaRapida = currentPath === '/busca-rapida' || currentPath === '/meta-ads';
  const isInAnalytics = currentPath === '/funnel-analysis' || currentPath === '/analise-mensal' || currentPath === '/launch-dashboard';
  
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
      default: return 'Projeto ativo';
    }
  };

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
              {/* Agência - sempre visível */}
              <Button
                onClick={() => navigate('/agencia')}
                variant={currentPath === '/agencia' ? "default" : "outline"}
                className="gap-2"
              >
                <Building2 className="w-4 h-4" />
                Agência
              </Button>

              {currentProject && (
                <>
                  {/* Visão Geral - only show if not on home */}
                  {currentPath !== '/' && currentPath !== '/agencia' && (
                    <Button
                      onClick={() => navigate('/')}
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
                      onClick={() => navigate('/busca-rapida')} 
                      className={`gap-2 cursor-pointer ${currentPath === '/busca-rapida' ? 'bg-muted' : ''}`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Hotmart
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/meta-ads')} 
                      className={`gap-2 cursor-pointer ${currentPath === '/meta-ads' ? 'bg-muted' : ''}`}
                    >
                      <Facebook className="w-4 h-4" />
                      Meta Ads
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Dropdown Análises */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={isInAnalytics ? "default" : "outline"} className="gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Análises
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => navigate('/funnel-analysis')} 
                      className={`gap-2 cursor-pointer ${currentPath === '/funnel-analysis' ? 'bg-muted' : ''}`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Análise de Funil
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/analise-mensal')} 
                      className={`gap-2 cursor-pointer ${currentPath === '/analise-mensal' ? 'bg-muted' : ''}`}
                    >
                      <CalendarDays className="w-4 h-4" />
                      Índices Mensais
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/launch-dashboard')} 
                      className={`gap-2 cursor-pointer ${currentPath === '/launch-dashboard' ? 'bg-muted' : ''}`}
                    >
                      <Rocket className="w-4 h-4" />
                      Lançamentos
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* A Definir */}
                <Button
                  onClick={() => navigate('/undefined-offers')}
                  variant={currentPath === '/undefined-offers' ? "default" : "outline"}
                  className="gap-2"
                >
                  <Package className="w-4 h-4" />
                  A Definir
                </Button>

                {/* CRM */}
                <Button
                  onClick={() => navigate('/crm')}
                  variant={currentPath === '/crm' ? "default" : "outline"}
                  className="gap-2"
                >
                  <Users className="w-4 h-4" />
                  CRM
                </Button>

                {/* Mapeamento de Ofertas */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={() => canAccessOfferMappings && navigate('/offer-mappings')}
                          variant={currentPath === '/offer-mappings' ? "default" : "outline"}
                          className="gap-2"
                          disabled={!canAccessOfferMappings}
                        >
                          {!canAccessOfferMappings && <Lock className="w-4 h-4" />}
                          {canAccessOfferMappings && <Settings className="w-4 h-4" />}
                          Ofertas
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canAccessOfferMappings && (
                      <TooltipContent>
                        <p>Apenas proprietários e gerentes podem acessar</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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
