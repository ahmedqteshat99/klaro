import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { captureAttributionFromLocation } from "@/lib/attribution";
import { initializeKlaro } from "@/lib/cookie-consent";
import AdminRoute from "./components/admin/AdminRoute";
import "klaro/dist/klaro.css";
import "@/styles/cookie-banner.css";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProfilPage = lazy(() => import("./pages/ProfilPage"));
const UnterlagenPage = lazy(() => import("./pages/UnterlagenPage"));
const AnschreibenPage = lazy(() => import("./pages/AnschreibenPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const JobDetailPage = lazy(() => import("./pages/JobDetailPage"));
const InboxPage = lazy(() => import("./pages/InboxPage"));
const DatenschutzPage = lazy(() => import("./pages/DatenschutzPage"));
const AgbPage = lazy(() => import("./pages/AgbPage"));
const DatenaufbewahrungPage = lazy(() => import("./pages/DatenaufbewahrungPage"));
const ImpressumPage = lazy(() => import("./pages/ImpressumPage"));
// const AgbPage = lazy(() => import("./pages/AgbPage")); // Removed duplicate
const NotFound = lazy(() => import("./pages/NotFound"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminJobsPage = lazy(() => import("./pages/admin/AdminJobsPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminUserDetailPage = lazy(() => import("./pages/admin/AdminUserDetailPage"));
const AdminDataSubjectPage = lazy(() => import("./pages/admin/AdminDataSubjectPage"));

const queryClient = new QueryClient();

const AttributionTracker = () => {
  const location = useLocation();

  useEffect(() => {
    captureAttributionFromLocation(location.pathname, location.search);
  }, [location.pathname, location.search]);

  return null;
};

const App = () => {
  // Initialize cookie consent on mount
  useEffect(() => {
    initializeKlaro();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AttributionTracker />
          <Suspense
            fallback={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Lädt…</p>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/profil" element={<ProfilPage />} />
              <Route path="/unterlagen" element={<UnterlagenPage />} />
              <Route path="/anschreiben" element={<AnschreibenPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/jobs/:id/:slug" element={<JobDetailPage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/datenschutz" element={<DatenschutzPage />} />
              <Route path="/agb" element={<AgbPage />} />
              <Route path="/datenaufbewahrung" element={<DatenaufbewahrungPage />} />
              <Route path="/impressum" element={<ImpressumPage />} />
              {/* <Route path="/agb" element={<AgbPage />} /> Removed duplicate */}
              <Route path="/admin" element={<AdminRoute />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="jobs" element={<AdminJobsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/:id" element={<AdminUserDetailPage />} />
                <Route path="data-subjects" element={<AdminDataSubjectPage />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
