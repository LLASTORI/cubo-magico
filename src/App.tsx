import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
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
import NotFound from "./pages/NotFound";

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
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
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
                <Route path="/project-overview" element={
                  <ProtectedRoute>
                    <ProjectOverview />
                  </ProtectedRoute>
                } />
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
