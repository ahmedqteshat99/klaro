import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { captureAttributionFromLocation } from "@/lib/attribution";
import { initializeKlaro } from "@/lib/cookie-consent";
import { supabase } from "@/integrations/supabase/client";
import AdminRoute from "./components/admin/AdminRoute";
import "klaro/dist/klaro.css";
import "@/styles/cookie-banner.css";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const ComingSoonPage = lazy(() => import("./pages/ComingSoonPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProfilPage = lazy(() => import("./pages/ProfilPage"));
const UnterlagenPage = lazy(() => import("./pages/UnterlagenPage"));
const AnschreibenPage = lazy(() => import("./pages/AnschreibenPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const JobDetailPage = lazy(() => import("./pages/JobDetailPage"));
const InboxPage = lazy(() => import("./pages/InboxPage"));
const DatenschutzPage = lazy(() => import("./pages/DatenschutzPage"));
const DatenaufbewahrungPage = lazy(() => import("./pages/DatenaufbewahrungPage"));
const ImpressumPage = lazy(() => import("./pages/ImpressumPage"));
const AgbPage = lazy(() => import("./pages/AgbPage"));
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

const MaintenanceDashboardRoute = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const allowedEmails = useMemo(
    () =>
      (import.meta.env.VITE_MAINTENANCE_ALLOWED_EMAILS ?? "")
        .split(",")
        .map((email: string) => email.trim().toLowerCase())
        .filter(Boolean),
    []
  );

  useEffect(() => {
    let isMounted = true;

    const resolveAccess = (email?: string | null) => {
      if (!isMounted) return;
      const normalizedEmail = email?.trim().toLowerCase() ?? "";
      setIsAllowed(Boolean(normalizedEmail) && allowedEmails.includes(normalizedEmail));
      setIsLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => resolveAccess(session?.user?.email));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveAccess(session?.user?.email);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [allowedEmails]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Lädt…</p>
      </div>
    );
  }

  if (!isAllowed) {
    return <ComingSoonPage />;
  }

  return <Dashboard />;
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
            <Route path="/" element={<ComingSoonPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<MaintenanceDashboardRoute />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/profil" element={<ProfilPage />} />
            <Route path="/unterlagen" element={<UnterlagenPage />} />
            <Route path="/anschreiben" element={<AnschreibenPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/jobs/:id/:slug" element={<JobDetailPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route path="/datenaufbewahrung" element={<DatenaufbewahrungPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/agb" element={<AgbPage />} />
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
