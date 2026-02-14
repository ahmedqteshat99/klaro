import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isOnboardingDone, checkOnboardingFromDB } from "@/pages/OnboardingPage";
import { useProfile } from "@/hooks/useProfile";
import { useUserFileUrl } from "@/hooks/useUserFileUrl";
import { getMissingFirstApplyFields } from "@/lib/first-apply";
import { logEvent, touchLastSeen } from "@/lib/app-events";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@supabase/supabase-js";
import BrandLogo from "@/components/BrandLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Loader2,
  LogOut,
} from "lucide-react";

type HubSectionId = "cv_profile" | "anschreiben" | "inbox" | "documents" | "jobs";
type HubSectionState = "done" | "in_progress" | "todo";

type HubMetrics = {
  cvCount: number;
  anschreibenCount: number;
  applicationsCount: number;
  unreadInboxCount: number;
  docsCount: number;
  docsByType: string[];
  jobsCount: number;
};

interface HubSection {
  id: HubSectionId;
  title: string;
  to: string;
  metric: string;
  state: HubSectionState;
  emoji: string;
}

const REQUIRED_DOC_TYPES = [
  { key: "approbation", label: "Approbation" },
  { key: "language_certificate", label: "Sprachzertifikat" },
  { key: "zeugnis", label: "Zeugnis" },
] as const;

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState<HubMetrics>({
    cvCount: 0,
    anschreibenCount: 0,
    applicationsCount: 0,
    unreadInboxCount: 0,
    docsCount: 0,
    docsByType: [],
    jobsCount: 0,
  });

  const { profile, isLoading: isProfileLoading, userId } = useProfile();
  const { url: profilePhotoUrl } = useUserFileUrl(profile?.foto_url);
  const hubViewLoggedRef = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setIsAuthLoading(false);

      if (!nextSession) {
        navigate("/auth");
        return;
      }

      if (!isOnboardingDone(nextSession.user.id)) {
        const done = await checkOnboardingFromDB(nextSession.user.id);
        if (!done) navigate("/onboarding");
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setIsAuthLoading(false);

      if (!initialSession) {
        navigate("/auth");
        return;
      }

      if (!isOnboardingDone(initialSession.user.id)) {
        const done = await checkOnboardingFromDB(initialSession.user.id);
        if (!done) navigate("/onboarding");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadHubMetrics = useCallback(async (uid: string) => {
    setIsMetricsLoading(true);

    const [versionsRes, docsRes, appsCountRes, unreadCountRes, jobsCountRes] = await Promise.all([
      supabase
        .from("document_versions")
        .select("typ")
        .eq("user_id", uid)
        .in("typ", ["CV", "Anschreiben"])
        .limit(120),
      supabase.from("user_documents").select("doc_type").eq("user_id", uid),
      supabase.from("applications").select("id", { head: true, count: "exact" }).eq("user_id", uid),
      supabase
        .from("application_messages")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", uid)
        .eq("direction", "inbound")
        .eq("is_read", false),
      supabase.from("jobs").select("id", { head: true, count: "exact" }).eq("is_published", true),
    ]);

    if (versionsRes.error || docsRes.error || appsCountRes.error || unreadCountRes.error || jobsCountRes.error) {
      console.warn("loadHubMetrics error", {
        versions: versionsRes.error?.message,
        docs: docsRes.error?.message,
        apps: appsCountRes.error?.message,
        unread: unreadCountRes.error?.message,
        jobs: jobsCountRes.error?.message,
      });
    }

    const versionRows = versionsRes.data ?? [];
    setMetrics({
      cvCount: versionRows.filter((item) => item.typ === "CV").length,
      anschreibenCount: versionRows.filter((item) => item.typ === "Anschreiben").length,
      applicationsCount: appsCountRes.count ?? 0,
      unreadInboxCount: unreadCountRes.count ?? 0,
      docsCount: docsRes.data?.length ?? 0,
      docsByType: Array.from(new Set((docsRes.data ?? []).map((doc) => doc.doc_type))),
      jobsCount: jobsCountRes.count ?? 0,
    });
    setIsMetricsLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    void loadHubMetrics(userId);
    void touchLastSeen(userId);
  }, [loadHubMetrics, userId]);

  const missingProfileFields = useMemo(
    () => getMissingFirstApplyFields(profile, session?.user?.email),
    [profile, session?.user?.email]
  );

  const missingDocLabels = useMemo(() => {
    const available = new Set(metrics.docsByType);
    return REQUIRED_DOC_TYPES.filter((doc) => !available.has(doc.key)).map((doc) => doc.label);
  }, [metrics.docsByType]);

  const sectionStates = useMemo(() => {
    const profileReady = missingProfileFields.length === 0;

    const cvProfileState: HubSectionState =
      profileReady && metrics.cvCount > 0 ? "done" : profileReady || metrics.cvCount > 0 ? "in_progress" : "todo";

    const anschreibenState: HubSectionState = metrics.anschreibenCount > 0 ? "done" : "todo";

    const inboxState: HubSectionState =
      metrics.applicationsCount === 0
        ? "todo"
        : metrics.unreadInboxCount > 0
          ? "in_progress"
          : "done";

    const documentsState: HubSectionState =
      missingDocLabels.length === 0 && metrics.docsCount > 0
        ? "done"
        : metrics.docsCount > 0
          ? "in_progress"
          : "todo";

    const jobsState: HubSectionState =
      metrics.applicationsCount > 0 ? "done" : metrics.jobsCount > 0 ? "in_progress" : "todo";

    return {
      cv_profile: cvProfileState,
      anschreiben: anschreibenState,
      inbox: inboxState,
      documents: documentsState,
      jobs: jobsState,
    } satisfies Record<HubSectionId, HubSectionState>;
  }, [metrics.anschreibenCount, metrics.applicationsCount, metrics.cvCount, metrics.docsCount, metrics.jobsCount, metrics.unreadInboxCount, missingDocLabels.length, missingProfileFields.length]);

  const sections = useMemo<HubSection[]>(() => {
    return [
      {
        id: "cv_profile",
        title: "CV & Profile",
        to: "/profil?focus=cv-profile",
        metric: metrics.cvCount > 0 ? `${metrics.cvCount} CV-Versionen` : "Starten",
        state: sectionStates.cv_profile,
        emoji: "👤",
      },
      {
        id: "anschreiben",
        title: "Anschreiben",
        to: "/anschreiben",
        metric: metrics.anschreibenCount > 0 ? `${metrics.anschreibenCount} gespeichert` : "Neu erstellen",
        state: sectionStates.anschreiben,
        emoji: "✍️",
      },
      {
        id: "inbox",
        title: "Inbox",
        to: "/inbox",
        metric: metrics.unreadInboxCount > 0 ? `${metrics.unreadInboxCount} ungelesen` : "Alles aktuell",
        state: sectionStates.inbox,
        emoji: "📥",
      },
      {
        id: "documents",
        title: "Unterlagen",
        to: "/unterlagen",
        metric: `${metrics.docsCount} hochgeladen`,
        state: sectionStates.documents,
        emoji: "📄",
      },
      {
        id: "jobs",
        title: "Jobsbörse",
        to: "/jobs",
        metric: `${metrics.jobsCount} offen`,
        state: sectionStates.jobs,
        emoji: "💼",
      },
    ];
  }, [metrics.anschreibenCount, metrics.docsCount, metrics.jobsCount, metrics.unreadInboxCount, sectionStates]);

  const completion = useMemo(() => {
    const done = sections.filter((section) => section.state === "done").length;
    const inProgress = sections.filter((section) => section.state === "in_progress").length;
    const total = sections.length;
    const percent = Math.round((done / total) * 100);
    return { done, inProgress, total, percent };
  }, [sections]);

  useEffect(() => {
    if (!userId || isMetricsLoading || isProfileLoading || hubViewLoggedRef.current) return;

    hubViewLoggedRef.current = true;
    void logEvent(
      "dashboard_hub_view",
      {
        completed_sections: completion.done,
        in_progress_sections: completion.inProgress,
        total_sections: completion.total,
        progress_percent: completion.percent,
      },
      userId
    );

    void logEvent(
      "dashboard_progress_snapshot",
      {
        progress_percent: completion.percent,
        missing_profile_fields: missingProfileFields,
        missing_doc_labels: missingDocLabels,
        unread_inbox: metrics.unreadInboxCount,
      },
      userId
    );
  }, [completion.done, completion.inProgress, completion.percent, completion.total, isMetricsLoading, isProfileLoading, metrics.unreadInboxCount, missingDocLabels, missingProfileFields, userId]);

  const handleSectionClick = (section: HubSection) => {
    void logEvent(
      "dashboard_circle_click",
      {
        section_id: section.id,
        destination: section.to,
        section_state: section.state,
      },
      userId
    );
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Fehler",
        description: "Abmeldung fehlgeschlagen.",
        variant: "destructive",
      });
      return;
    }

    navigate("/");
  };

  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-3 pr-1">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profilePhotoUrl || undefined} alt={profile?.vorname || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {profile?.vorname?.[0]}
                  {profile?.nachname?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{profile?.vorname || "Dashboard"}</span>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
              <Link to="/jobs">Jobs</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
              <Link to="/inbox">Inbox</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="h-10 px-3 sm:h-9 sm:px-4">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Abmelden</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 pt-20 sm:pt-24 pb-10 space-y-5">
        <Card className="apple-surface-strong border-border/60">
          <CardContent className="p-5 sm:p-6">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Hallo{profile?.vorname ? `, ${profile.vorname}` : ""}
              </h1>
            </div>
          </CardContent>
        </Card>

        <div className="dashboard-circle-grid">
          {isMetricsLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="dashboard-orbit-card dashboard-orbit-skeleton" aria-hidden="true" />
              ))
            : sections.map((section) => {
                return (
                  <Link
                    key={section.id}
                    to={section.to}
                    onClick={() => handleSectionClick(section)}
                    className="dashboard-orbit-card apple-focus-ring"
                  >
                    <div className="dashboard-orbit-head">
                      <div className="dashboard-orbit-icon-wrap">
                        <span className="dashboard-orbit-emoji" role="img" aria-label={section.title}>
                          {section.emoji}
                        </span>
                      </div>
                    </div>

                    <div className="dashboard-orbit-body">
                      <p className="dashboard-orbit-title">{section.title}</p>
                      <p className="dashboard-orbit-metric">{section.metric}</p>
                    </div>

                    <div className="dashboard-orbit-footer">
                      <span>Öffnen</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
