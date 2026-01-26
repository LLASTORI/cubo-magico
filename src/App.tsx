import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ProjectLayout } from "@/components/ProjectLayout";
import { ProjectBootstrapGate } from "@/components/ProjectBootstrapGate";
// Public pages
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import DataDeletion from "./pages/DataDeletion";
import NoAccess from "./pages/NoAccess";
import ActivateAccount from "./pages/ActivateAccount";
import AcceptInvite from "./pages/AcceptInvite";
import SurveyPublic from "./pages/SurveyPublic";
import SurveyPublicLegacy from "./pages/SurveyPublicLegacy";
import QuizPublic from "./pages/QuizPublic";
import NotFound from "./pages/NotFound";

// Protected pages - require auth but not project context
import Projects from "./pages/Projects";
import Onboarding from "./pages/Onboarding";
import Admin from "./pages/Admin";
import AgencyDashboard from "./pages/AgencyDashboard";

// Project-scoped pages - require auth AND project context
import BuscaRapida from "./pages/BuscaRapida";
import ProjectOverview from "./pages/ProjectOverview";
import OfferMappings from "./pages/OfferMappings";
import FunnelAnalysis from "./pages/FunnelAnalysis";
import DataDebug from "./pages/DataDebug";
import Settings from "./pages/Settings";
import NotificationsHistory from "./pages/NotificationsHistory";
import MetaAds from "./pages/MetaAds";
import UndefinedOffers from "./pages/UndefinedOffers";
import LaunchDashboard from "./pages/LaunchDashboard";
import AnaliseMensal from "./pages/AnaliseMensal";
import SalesHistory from "./pages/SalesHistory";
import CRM from "./pages/CRM";
import CRMUTMBehavior from "./pages/CRMUTMBehavior";
import CRMKanban from "./pages/CRMKanban";
import CRMContactCard from "./pages/CRMContactCard";
import CRMPipelineSettings from "./pages/CRMPipelineSettings";
import CRMActivitiesDashboard from "./pages/CRMActivitiesDashboard";
import CRMCadences from "./pages/CRMCadences";
import CRMRecovery from "./pages/CRMRecovery";
import CRMRecoveryKanban from "./pages/CRMRecoveryKanban";
import CRMRecoverySettings from "./pages/CRMRecoverySettings";
import WhatsAppLiveChat from "./pages/WhatsAppLiveChat";
import AutomationFlows from "./pages/AutomationFlows";
import AutomationFlowEditor from "./pages/AutomationFlowEditor";
import AutomationExecutions from "./pages/AutomationExecutions";
import Surveys from "./pages/Surveys";
import SurveyEditor from "./pages/SurveyEditor";
import SurveyResponses from "./pages/SurveyResponses";
import InsightsDashboard from "./pages/InsightsDashboard";
import SocialListeningPage from "./pages/SocialListeningPage";
import SurveyAnalysisPage from "./pages/SurveyAnalysisPage";
import Quizzes from "./pages/Quizzes";
import QuizEditor from "./pages/QuizEditor";
import QuizResults from "./pages/QuizResults";
import QuizSessionViewer from "./pages/QuizSessionViewer";
import QuizAnswersViewer from "./pages/QuizAnswersViewer";

// ============= CRITICAL: QueryClient OUTSIDE component =============
// This ensures QueryClient is stable across renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent refetching on window focus causing state loss
      refetchOnWindowFocus: false,
      // Keep data stable during tab switches
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// ============= FORENSIC DEBUG: APP MOUNT DETECTION =============
const APP_INSTANCE_ID = `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
console.log(`%c[FORENSIC] App.tsx PARSED - QueryClient created - ID: ${APP_INSTANCE_ID}`, 'background: #0066ff; color: white; font-size: 14px; padding: 4px;');

/**
 * ARQUITETURA CANÔNICA DE ROTEAMENTO
 * 
 * REGRA DE OURO: O projeto ativo SEMPRE vem da URL.
 * Pattern: /app/:projectCode/*
 * 
 * HIERARQUIA CRÍTICA (de fora para dentro):
 * 1. ThemeProvider - temas
 * 2. QueryClientProvider - cache de dados
 * 3. BrowserRouter - navegação (FORA do Auth!)
 * 4. AuthProvider - autenticação
 * 5. ProjectProvider - contexto de projetos
 * 
 * IMPORTANTE: BrowserRouter está DENTRO do QueryClientProvider mas FORA
 * de lógica que possa causar remount. AuthProvider e ProjectProvider
 * apenas atualizam state, nunca desmontam children.
 */
const App = () => {
  console.log(`%c[FORENSIC] App RENDER - ID: ${APP_INSTANCE_ID}`, 'background: #0066ff; color: white; padding: 2px;');
  
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ProjectProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <ProjectBootstrapGate>
                  <Routes>
                    {/* ==================== PUBLIC ROUTES ==================== */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/data-deletion" element={<DataDeletion />} />
                    <Route path="/no-access" element={<NoAccess />} />
                    <Route path="/activate" element={<ActivateAccount />} />
                    <Route path="/accept-invite" element={<AcceptInvite />} />
                    
                    {/* Survey & Quiz Public Routes - Multi-tenant */}
                    <Route path="/s/:code/:slug" element={<SurveyPublic />} />
                    <Route path="/s/:slug" element={<SurveyPublicLegacy />} />
                    <Route path="/q/:code/:slug" element={<QuizPublic />} />
                    <Route path="/q/:quizId" element={<QuizPublic />} />

                    {/* ==================== PROTECTED ROUTES (no project context) ==================== */}
                    {/* / e /projects agora são gerenciados pelo ProjectBootstrapGate */}
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Projects />
                      </ProtectedRoute>
                    } />
                    <Route path="/projects" element={
                      <ProtectedRoute>
                        <Projects />
                      </ProtectedRoute>
                    } />
                    <Route path="/onboarding" element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin" element={
                      <ProtectedRoute>
                        <Admin />
                      </ProtectedRoute>
                    } />
                    <Route path="/agencia" element={
                      <ProtectedRoute>
                        <AgencyDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/notifications" element={
                      <ProtectedRoute>
                        <NotificationsHistory />
                      </ProtectedRoute>
                    } />

                    {/* ==================== PROJECT-SCOPED ROUTES ==================== */}
                    {/* All routes under /app/:projectCode require both auth AND valid project */}
                    <Route path="/app/:projectCode" element={
                      <ProtectedRoute>
                        <ProjectLayout />
                      </ProtectedRoute>
                    }>
                      {/* Dashboard / Overview */}
                      <Route index element={<ProjectOverview />} />
                      <Route path="dashboard" element={<ProjectOverview />} />
                      
                      {/* Sales / Vendas */}
                      <Route path="busca-rapida" element={<BuscaRapida />} />
                      <Route path="vendas/historico" element={<SalesHistory />} />
                      
                      {/* Analytics */}
                      <Route path="funnel-analysis" element={<FunnelAnalysis />} />
                      <Route path="analise-mensal" element={<AnaliseMensal />} />
                      <Route path="launch-dashboard" element={<LaunchDashboard />} />
                      <Route path="undefined-offers" element={<UndefinedOffers />} />
                      <Route path="offer-mappings" element={<OfferMappings />} />
                      
                      {/* Meta Ads */}
                      <Route path="meta-ads" element={<MetaAds />} />
                      
                      {/* CRM */}
                      <Route path="crm" element={<CRM />} />
                      <Route path="crm/utm-behavior" element={<CRMUTMBehavior />} />
                      <Route path="crm/kanban" element={<CRMKanban />} />
                      <Route path="crm/contact/:contactId" element={<CRMContactCard />} />
                      <Route path="crm/pipeline-settings" element={<CRMPipelineSettings />} />
                      <Route path="crm/activities" element={<CRMActivitiesDashboard />} />
                      <Route path="crm/cadences" element={<CRMCadences />} />
                      <Route path="crm/recovery" element={<CRMRecovery />} />
                      <Route path="crm/recovery/kanban" element={<CRMRecoveryKanban />} />
                      <Route path="crm/recovery/settings" element={<CRMRecoverySettings />} />
                      
                      {/* WhatsApp & Automations */}
                      <Route path="whatsapp" element={<WhatsAppLiveChat />} />
                      <Route path="automations" element={<AutomationFlows />} />
                      <Route path="automations/:flowId" element={<AutomationFlowEditor />} />
                      <Route path="automations/executions" element={<AutomationExecutions />} />
                      
                      {/* Surveys */}
                      <Route path="surveys" element={<Surveys />} />
                      <Route path="surveys/:surveyId" element={<SurveyEditor />} />
                      <Route path="surveys/:surveyId/responses" element={<SurveyResponses />} />
                      
                      {/* Quizzes */}
                      <Route path="quizzes" element={<Quizzes />} />
                      <Route path="quizzes/:quizId" element={<QuizEditor />} />
                      <Route path="quizzes/:quizId/results" element={<QuizResults />} />
                      <Route path="quizzes/:quizId/sessions/:sessionId" element={<QuizSessionViewer />} />
                      <Route path="quizzes/:quizId/sessions/:sessionId/answers" element={<QuizAnswersViewer />} />
                      
                      {/* Insights */}
                      <Route path="insights" element={<InsightsDashboard />} />
                      <Route path="insights/surveys" element={<Surveys />} />
                      <Route path="insights/surveys/:surveyId" element={<SurveyEditor />} />
                      <Route path="insights/surveys/:surveyId/responses" element={<SurveyResponses />} />
                      <Route path="insights/surveys/analysis" element={<SurveyAnalysisPage />} />
                      <Route path="insights/surveys/analysis/by-survey" element={<SurveyAnalysisPage />} />
                      <Route path="insights/surveys/analysis/ai-settings" element={<SurveyAnalysisPage />} />
                      <Route path="insights/surveys/analysis/guide" element={<SurveyAnalysisPage />} />
                      <Route path="insights/social" element={<SocialListeningPage />} />
                      
                      {/* Settings & Debug */}
                      <Route path="settings" element={<Settings />} />
                      <Route path="data-debug" element={<DataDebug />} />
                    </Route>

                    {/* ==================== LEGACY REDIRECTS ==================== */}
                    {/* Redirect old routes to project selector - will be auto-redirected by BootstrapGate */}
                    <Route path="/busca-rapida" element={<Navigate to="/" replace />} />
                    <Route path="/funnel-analysis" element={<Navigate to="/" replace />} />
                    <Route path="/analise-mensal" element={<Navigate to="/" replace />} />
                    <Route path="/launch-dashboard" element={<Navigate to="/" replace />} />
                    <Route path="/meta-ads" element={<Navigate to="/" replace />} />
                    <Route path="/crm" element={<Navigate to="/" replace />} />
                    <Route path="/crm/*" element={<Navigate to="/" replace />} />
                    <Route path="/whatsapp" element={<Navigate to="/" replace />} />
                    <Route path="/automations" element={<Navigate to="/" replace />} />
                    <Route path="/automations/*" element={<Navigate to="/" replace />} />
                    <Route path="/surveys" element={<Navigate to="/" replace />} />
                    <Route path="/surveys/*" element={<Navigate to="/" replace />} />
                    <Route path="/quizzes" element={<Navigate to="/" replace />} />
                    <Route path="/quizzes/*" element={<Navigate to="/" replace />} />
                    <Route path="/insights" element={<Navigate to="/" replace />} />
                    <Route path="/insights/*" element={<Navigate to="/" replace />} />
                    <Route path="/settings" element={<Navigate to="/" replace />} />
                    <Route path="/offer-mappings" element={<Navigate to="/" replace />} />
                    <Route path="/undefined-offers" element={<Navigate to="/" replace />} />
                    <Route path="/data-debug" element={<Navigate to="/" replace />} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ProjectBootstrapGate>
              </TooltipProvider>
            </ProjectProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
