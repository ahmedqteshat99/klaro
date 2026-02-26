import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { captureAttributionFromLocation } from "@/lib/attribution";
import { initializeKlaro } from "@/lib/cookie-consent";
import AdminRoute from "./components/admin/AdminRoute";
import AuthorizedRoute from "./components/auth/AuthorizedRoute";
import "klaro/dist/klaro.css";
import "@/styles/cookie-banner.css";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ComingSoonPage = lazy(() => import("./pages/ComingSoonPage"));
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
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const NewLandingPage = lazy(() => import("./pages/NewLandingPage"));

const queryClient = new QueryClient();

const AttributionTracker = () => {
  const location = useLocation();

  useEffect(() => {
    captureAttributionFromLocation(location.pathname, location.search);
  }, [location.pathname, location.search]);

  return null;
};

const App = () => {
  // Initialize cookie consent - deferred to next event loop for better initial load
  useEffect(() => {
    setTimeout(() => {
      initializeKlaro();
    }, 0);
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
              {/* Public routes */}
              <Route path="/" element={<NewLandingPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/datenschutz" element={<DatenschutzPage />} />
              <Route path="/agb" element={<AgbPage />} />
              <Route path="/datenaufbewahrung" element={<DatenaufbewahrungPage />} />
              <Route path="/impressum" element={<ImpressumPage />} />

              {/* Public job listings - drives user acquisition */}
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/jobs/:id/:slug" element={<JobDetailPage />} />

              {/* Protected routes - require authorization */}
              <Route path="/dashboard" element={<AuthorizedRoute><Dashboard /></AuthorizedRoute>} />
              <Route path="/onboarding" element={<AuthorizedRoute><OnboardingPage /></AuthorizedRoute>} />
              <Route path="/profil" element={<AuthorizedRoute><ProfilPage /></AuthorizedRoute>} />
              <Route path="/unterlagen" element={<AuthorizedRoute><UnterlagenPage /></AuthorizedRoute>} />
              <Route path="/anschreiben" element={<AuthorizedRoute><AnschreibenPage /></AuthorizedRoute>} />
              <Route path="/inbox" element={<AuthorizedRoute><InboxPage /></AuthorizedRoute>} />

              {/* Admin routes - require authorization */}
              <Route path="/admin" element={<AuthorizedRoute><AdminRoute /></AuthorizedRoute>}>
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
