import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BuscaRapida from "./pages/BuscaRapida";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Projects from "./pages/Projects";
import OfferMappings from "./pages/OfferMappings";
import FunnelAnalysis from "./pages/FunnelAnalysis";
import ProjectOverview from "./pages/ProjectOverview";
import DataDebug from "./pages/DataDebug";
import Settings from "./pages/Settings";
import NotificationsHistory from "./pages/NotificationsHistory";
import Admin from "./pages/Admin";
import MetaAds from "./pages/MetaAds";
import UndefinedOffers from "./pages/UndefinedOffers";
import LaunchDashboard from "./pages/LaunchDashboard";
import AnaliseMensal from "./pages/AnaliseMensal";
import AgencyDashboard from "./pages/AgencyDashboard";
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
import SurveyPublic from "./pages/SurveyPublic";
import SurveyPublicLegacy from "./pages/SurveyPublicLegacy";
import InsightsDashboard from "./pages/InsightsDashboard";
import SocialListeningPage from "./pages/SocialListeningPage";
import SurveyAnalysisPage from "./pages/SurveyAnalysisPage";
import Quizzes from "./pages/Quizzes";
import QuizEditor from "./pages/QuizEditor";
import QuizResults from "./pages/QuizResults";
import QuizPublic from "./pages/QuizPublic";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import DataDeletion from "./pages/DataDeletion";
import Onboarding from "./pages/Onboarding";
import NoAccess from "./pages/NoAccess";
import ActivateAccount from "./pages/ActivateAccount";
import AcceptInvite from "./pages/AcceptInvite";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/data-deletion" element={<DataDeletion />} />
                <Route path="/no-access" element={<NoAccess />} />
                <Route path="/activate" element={<ActivateAccount />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                {/* Survey Public Routes - Multi-tenant */}
                <Route path="/s/:code/:slug" element={<SurveyPublic />} />
                {/* Legacy route for backward compatibility */}
                <Route path="/s/:slug" element={<SurveyPublicLegacy />} />
                {/* Quiz Public Route */}
                <Route path="/q/:quizId" element={<QuizPublic />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <ProjectOverview />
                  </ProtectedRoute>
                } />
                <Route path="/busca-rapida" element={
                  <ProtectedRoute>
                    <BuscaRapida />
                  </ProtectedRoute>
                } />
                <Route path="/onboarding" element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                } />
                <Route path="/projects" element={
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                } />
                <Route path="/offer-mappings" element={
                  <ProtectedRoute>
                    <OfferMappings />
                  </ProtectedRoute>
                } />
                <Route path="/funnel-analysis" element={
                  <ProtectedRoute>
                    <FunnelAnalysis />
                  </ProtectedRoute>
                } />
                {/* /project-overview now redirects to / */}
                <Route path="/data-debug" element={
                  <ProtectedRoute>
                    <DataDebug />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <NotificationsHistory />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="/meta-ads" element={
                  <ProtectedRoute>
                    <MetaAds />
                  </ProtectedRoute>
                } />
                <Route path="/undefined-offers" element={
                  <ProtectedRoute>
                    <UndefinedOffers />
                  </ProtectedRoute>
                } />
                <Route path="/launch-dashboard" element={
                  <ProtectedRoute>
                    <LaunchDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/analise-mensal" element={
                  <ProtectedRoute>
                    <AnaliseMensal />
                  </ProtectedRoute>
                } />
                <Route path="/agencia" element={
                  <ProtectedRoute>
                    <AgencyDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/crm" element={
                  <ProtectedRoute>
                    <CRM />
                  </ProtectedRoute>
                } />
                <Route path="/crm/utm-behavior" element={
                  <ProtectedRoute>
                    <CRMUTMBehavior />
                  </ProtectedRoute>
                } />
                <Route path="/crm/kanban" element={
                  <ProtectedRoute>
                    <CRMKanban />
                  </ProtectedRoute>
                } />
                <Route path="/crm/contact/:contactId" element={
                  <ProtectedRoute>
                    <CRMContactCard />
                  </ProtectedRoute>
                } />
                <Route path="/crm/pipeline-settings" element={
                  <ProtectedRoute>
                    <CRMPipelineSettings />
                  </ProtectedRoute>
                } />
                <Route path="/crm/activities" element={
                  <ProtectedRoute>
                    <CRMActivitiesDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/crm/cadences" element={
                  <ProtectedRoute>
                    <CRMCadences />
                  </ProtectedRoute>
                } />
                <Route path="/crm/recovery" element={
                  <ProtectedRoute>
                    <CRMRecovery />
                  </ProtectedRoute>
                } />
                <Route path="/crm/recovery/kanban" element={
                  <ProtectedRoute>
                    <CRMRecoveryKanban />
                  </ProtectedRoute>
                } />
                <Route path="/crm/recovery/settings" element={
                  <ProtectedRoute>
                    <CRMRecoverySettings />
                  </ProtectedRoute>
                } />
                <Route path="/whatsapp" element={
                  <ProtectedRoute>
                    <WhatsAppLiveChat />
                  </ProtectedRoute>
                } />
                <Route path="/automations" element={
                  <ProtectedRoute>
                    <AutomationFlows />
                  </ProtectedRoute>
                } />
                <Route path="/automations/:flowId" element={
                  <ProtectedRoute>
                    <AutomationFlowEditor />
                  </ProtectedRoute>
                } />
                <Route path="/automations/executions" element={
                  <ProtectedRoute>
                    <AutomationExecutions />
                  </ProtectedRoute>
                } />
                <Route path="/surveys" element={
                  <ProtectedRoute>
                    <Surveys />
                  </ProtectedRoute>
                } />
                <Route path="/surveys/:surveyId" element={
                  <ProtectedRoute>
                    <SurveyEditor />
                  </ProtectedRoute>
                } />
                <Route path="/surveys/:surveyId/responses" element={
                  <ProtectedRoute>
                    <SurveyResponses />
                  </ProtectedRoute>
                } />
                {/* Quiz Routes */}
                <Route path="/quizzes" element={
                  <ProtectedRoute>
                    <Quizzes />
                  </ProtectedRoute>
                } />
                <Route path="/quizzes/:quizId" element={
                  <ProtectedRoute>
                    <QuizEditor />
                  </ProtectedRoute>
                } />
                <Route path="/quizzes/:quizId/results" element={
                  <ProtectedRoute>
                    <QuizResults />
                  </ProtectedRoute>
                } />
                {/* Insights Module Routes */}
                <Route path="/insights" element={
                  <ProtectedRoute>
                    <InsightsDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/insights/surveys" element={
                  <ProtectedRoute>
                    <Surveys />
                  </ProtectedRoute>
                } />
                <Route path="/insights/surveys/:surveyId" element={
                  <ProtectedRoute>
                    <SurveyEditor />
                  </ProtectedRoute>
                } />
                <Route path="/insights/surveys/:surveyId/responses" element={
                  <ProtectedRoute>
                    <SurveyResponses />
                  </ProtectedRoute>
                } />
                <Route path="/insights/surveys/analysis" element={
                  <ProtectedRoute>
                    <SurveyAnalysisPage />
                  </ProtectedRoute>
                } />
                <Route path="/insights/surveys/analysis/by-survey" element={
                  <ProtectedRoute>
                    <SurveyAnalysisPage />
                  </ProtectedRoute>
                } />
                <Route path="/insights/surveys/analysis/ai-settings" element={
                  <ProtectedRoute>
                    <SurveyAnalysisPage />
                  </ProtectedRoute>
                } />
                <Route path="/insights/surveys/analysis/guide" element={
                  <ProtectedRoute>
                    <SurveyAnalysisPage />
                  </ProtectedRoute>
                } />
                <Route path="/insights/social" element={
                  <ProtectedRoute>
                    <SocialListeningPage />
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
