import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { generateAnschreiben, generateCV } from "@/lib/api/generation";
import { generatePdfBlobFromServer } from "@/lib/api/pdf-service";
import { sendApplicationEmail, mergeApplicationPdfs } from "@/lib/api/applications";
import { logFunnelEvent } from "@/lib/app-events";
import {
  clearApplyIntent,
  clearPendingCtaClick,
  getRememberedExperimentVariant,
  rememberApplyIntent,
  rememberCtaClick,
} from "@/lib/attribution";
import { LANDING_HERO_CTA_EXPERIMENT_ID } from "@/lib/experiments";
import { useDocumentVersions } from "@/hooks/useDocumentVersions";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useUserFileUrl } from "@/hooks/useUserFileUrl";
import { getMissingFirstApplyFields } from "@/lib/first-apply";
import { applySeoMeta } from "@/lib/seo";
import { buildJobPath } from "@/lib/slug";
import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Info,
  Loader2,
  Mail,
  MapPin,
  Send,
  Share2,
  Sparkles,
  Upload,
  AlertCircle,
} from "lucide-react";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const PREPARE_LOADING_STEPS = [
  "Wir kochen gerade Ihre Bewerbung...",
  "Lebenslauf wird zusammengestellt",
  "Anschreiben wird finalisiert",
  "E-Mail wird servierfertig gemacht",
] as const;
const PREPARE_COOKING_EMOJIS = ["👨‍🍳", "🥘", "🍲", "🍳", "🔥"] as const;

interface AttachmentPreview {
  fileName: string;
  sizeBytes: number;
  source: "generated" | "profile";
}

const humanFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toEmailHtml = (text: string) =>
  text
    .split("\n\n")
    .map((block) => `<p>${escapeHtml(block).replaceAll("\n", "<br/>")}</p>`)
    .join("");

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, "_");

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const toSchemaIsoDate = (value: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

const KLARO_EMAIL_DOMAIN = "@klaro.tools";
const KLARO_EMAIL_FOOTER_PREFIX = "Kontakt E-Mail:";

const normalizeEmailAddress = (value: string | null | undefined) => {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const buildLockedEmailFooter = (email: string) =>
  `\n\n${KLARO_EMAIL_FOOTER_PREFIX} ${email}`;

const stripLockedEmailFooter = (value: string) =>
  value.replace(/\n\n(?:Klaro\s+)?Kontakt[\s-]E-Mail:\s*[^\n]*\s*$/i, "").trimEnd();

const ensureLockedEmailFooter = (value: string, email: string | null) => {
  if (!email) return value;
  const content = stripLockedEmailFooter(value ?? "");
  return content
    ? `${content}${buildLockedEmailFooter(email)}`
    : `${KLARO_EMAIL_FOOTER_PREFIX} ${email}`;
};

const JobDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saveDocument } = useDocumentVersions();

  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [prepareStepIndex, setPrepareStepIndex] = useState(0);
  const [prepareProgress, setPrepareProgress] = useState(0);
  const [prepareProgressTarget, setPrepareProgressTarget] = useState(0);
  const [prepareEmojiIndex, setPrepareEmojiIndex] = useState(0);
  const prepareProgressTargetRef = useRef(0);

  const [job, setJob] = useState<Tables<"jobs"> | null>(null);
  const [userDocuments, setUserDocuments] = useState<Tables<"user_documents">[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [klaroEmail, setKlaroEmail] = useState<string | null>(null);
  const [preparedAttachments, setPreparedAttachments] = useState<AttachmentPreview[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [hasHandledApplyIntent, setHasHandledApplyIntent] = useState(false);
  const prepareApplicationRef = useRef<() => Promise<void>>(async () => {});

  const {
    profile,
    workExperiences,
    educationEntries,
    practicalExperiences,
    certifications,
    publications,
    isLoading: isProfileLoading,
    userId,
  } = useProfile();

  const { url: fotoUrl } = useUserFileUrl(profile?.foto_url);
  const { url: signaturUrl } = useUserFileUrl(profile?.signatur_url);

  // Personal email from profile (preferred for display in CV/Anschreiben/email body)
  const personalEmail = useMemo(() => normalizeEmailAddress(profile?.email), [profile?.email]);
  // Display email: personal if available, otherwise klaro (for email footer)
  const displayEmail = useMemo(() => personalEmail || klaroEmail, [personalEmail, klaroEmail]);

  const baseUrl =
    (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim().replace(/\/+$/, "") ||
    window.location.origin;
  const applyNextUrl = `${location.pathname}?action=apply`;
  const applyIntentActive = useMemo(
    () => new URLSearchParams(location.search).get("action") === "apply",
    [location.search]
  );

  const setPrepareProgressGoal = useCallback((goal: number) => {
    const boundedGoal = Math.min(100, Math.max(0, goal));
    setPrepareProgressTarget((prev) => {
      const next = Math.max(prev, boundedGoal);
      prepareProgressTargetRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSessionLoading(false);
      setIsAuthenticated(Boolean(session));
      setSessionEmail(session?.user?.email ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSessionLoading(false);
      setIsAuthenticated(Boolean(session));
      setSessionEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isPreparing) {
      setPrepareStepIndex(0);
      setPrepareProgress(0);
      setPrepareProgressTarget(0);
      prepareProgressTargetRef.current = 0;
      setPrepareEmojiIndex(0);
      return;
    }

    setPrepareProgress(3);
    setPrepareProgressGoal(12);

    const stepInterval = window.setInterval(() => {
      setPrepareStepIndex((prev) => (prev + 1) % PREPARE_LOADING_STEPS.length);
    }, 1400);

    const emojiInterval = window.setInterval(() => {
      setPrepareEmojiIndex((prev) => (prev + 1) % PREPARE_COOKING_EMOJIS.length);
    }, 550);

    const progressInterval = window.setInterval(() => {
      setPrepareProgress((prev) => {
        const target = prepareProgressTargetRef.current;
        if (prev >= target) return prev;
        const remaining = target - prev;
        const increment =
          remaining > 20 ? 1.3 : remaining > 10 ? 0.9 : remaining > 4 ? 0.55 : 0.3;
        return Math.min(target, Number((prev + increment).toFixed(1)));
      });
    }, 320);

    return () => {
      window.clearInterval(stepInterval);
      window.clearInterval(emojiInterval);
      window.clearInterval(progressInterval);
    };
  }, [isPreparing, setPrepareProgressGoal]);

  useEffect(() => {
    prepareProgressTargetRef.current = prepareProgressTarget;
  }, [prepareProgressTarget]);

  useEffect(() => {
    const normalized = normalizeEmailAddress(profile?.klaro_email);
    if (normalized && normalized.endsWith(KLARO_EMAIL_DOMAIN)) {
      setKlaroEmail(normalized);
    }
  }, [profile?.klaro_email]);

  const loadUserDocuments = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("user_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Dokumente konnten nicht geladen werden",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const docs = data ?? [];
    setUserDocuments(docs);

    setSelectedDocIds(new Set(docs.filter((doc) => doc.include_by_default).map((doc) => doc.id)));
  }, [toast, userId]);

  useEffect(() => {
    if (!userId) return;
    void loadUserDocuments();
  }, [loadUserDocuments, userId]);

  useEffect(() => {
    const loadJob = async () => {
      if (!id) return;
      setIsLoading(true);

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Job nicht gefunden",
          description: error?.message || "Der Job existiert nicht oder ist nicht veröffentlicht.",
          variant: "destructive",
        });
        setJob(null);
        setIsLoading(false);
        return;
      }

      setJob(data);
      setIsLoading(false);
    };

    void loadJob();
  }, [id, toast]);

  useEffect(() => {
    const canonicalUrl = job
      ? `${baseUrl}${buildJobPath({
          id: job.id,
          title: job.title,
          hospitalName: job.hospital_name,
        })}`
      : `${baseUrl}/jobs`;

    if (!job) {
      applySeoMeta({
        title: "Job nicht gefunden | Klaro",
        description: "Diese Stellenanzeige ist nicht verfügbar.",
        canonicalUrl,
        robots: "index,follow,max-image-preview:large",
      });
      return;
    }

    const plainDescription = normalizeText(job.description) || normalizeText(job.requirements);
    const metaDescription =
      plainDescription ||
      `${job.title}${job.hospital_name ? ` bei ${job.hospital_name}` : ""}${job.location ? ` in ${job.location}` : ""}.`;

    const jobPostingJsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description: metaDescription,
      datePosted: toSchemaIsoDate(job.published_at),
      validThrough: toSchemaIsoDate(job.expires_at),
      hiringOrganization: {
        "@type": "Organization",
        name: job.hospital_name || "Klaro Partnerklinik",
      },
      jobLocation: job.location
        ? {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.location,
              addressCountry: "DE",
            },
          }
        : undefined,
      applicantLocationRequirements: {
        "@type": "Country",
        name: "Deutschland",
      },
      employmentType: undefined,
      url: canonicalUrl,
      directApply: true,
    };

    if (job.apply_url) {
      jobPostingJsonLd.applicationContact = {
        "@type": "ContactPoint",
        url: job.apply_url,
      };
    }

    if (job.contact_email) {
      jobPostingJsonLd.applicationContact = {
        "@type": "ContactPoint",
        email: job.contact_email,
      };
    }

    applySeoMeta({
      title: `${job.title}${job.hospital_name ? ` bei ${job.hospital_name}` : ""} | Klaro Jobs`,
      description: metaDescription,
      canonicalUrl,
      robots: "index,follow,max-image-preview:large",
      ogType: "article",
      ogTitle: `${job.title} | Klaro Jobs`,
      ogDescription: metaDescription,
      jsonLd: jobPostingJsonLd,
    });
  }, [baseUrl, job]);

  useEffect(() => {
    if (!applyIntentActive) return;
    if (hasHandledApplyIntent) return;
    if (isSessionLoading || isLoading) return;
    if (!job) return;

    if (!isAuthenticated) {
      setHasHandledApplyIntent(true);
      rememberApplyIntent({
        jobId: job.id,
        jobTitle: job.title,
        jobPath: applyNextUrl,
        source: "job_detail",
      });
      navigate(`/auth?next=${encodeURIComponent(applyNextUrl)}`, { replace: true });
      return;
    }

    // Wait for profile hook hydration before deciding onboarding redirect.
    if (!userId || isProfileLoading) {
      return;
    }

    if (!profile) {
      setHasHandledApplyIntent(true);
      navigate(`/onboarding?next=${encodeURIComponent(applyNextUrl)}`, { replace: true });
      return;
    }

    setHasHandledApplyIntent(true);
    void prepareApplicationRef.current();
  }, [
    applyIntentActive,
    applyNextUrl,
    hasHandledApplyIntent,
    isAuthenticated,
    isLoading,
    isProfileLoading,
    isSessionLoading,
    job,
    navigate,
    profile,
    userId,
  ]);

  const selectedDocuments = useMemo(
    () => userDocuments.filter((doc) => selectedDocIds.has(doc.id)),
    [selectedDocIds, userDocuments]
  );

  const toggleSelectedDoc = (docId: string, checked: boolean) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(docId);
      } else {
        next.delete(docId);
      }
      return next;
    });
  };

  const buildDefaultMessageText = (targetJob: Tables<"jobs">, fullName: string) => {
    const parts = [
      "Sehr geehrte Damen und Herren,",
      `hiermit bewerbe ich mich auf die Position "${targetJob.title}"${targetJob.hospital_name ? ` bei ${targetJob.hospital_name}` : ""}.`,
      "Im Anhang finden Sie mein Anschreiben, meinen Lebenslauf und weitere Unterlagen.",
      "Ich freue mich auf Ihre Rückmeldung.",
      `Mit freundlichen Gruessen\n${fullName}`,
    ];

    return `${parts[0]}\n\n${parts[1]}\n${parts[2]}\n\n${parts[3]}\n\n${parts[4]}`;
  };

  const ensureKlaroEmailAddress = useCallback(async () => {
    const existing = normalizeEmailAddress(profile?.klaro_email);
    if (existing && existing.endsWith(KLARO_EMAIL_DOMAIN)) {
      setKlaroEmail(existing);
      return existing;
    }

    if (!userId) return null;

    const { data: provisionedEmail, error: provisionError } = await supabase.rpc("provision_user_alias", {
      p_user_id: userId,
      p_vorname: profile?.vorname ?? "",
      p_nachname: profile?.nachname ?? "",
    });

    if (provisionError) {
      console.error("Failed to provision klaro alias", provisionError);
    }

    const fromRpc =
      typeof provisionedEmail === "string" ? normalizeEmailAddress(provisionedEmail) : null;

    if (fromRpc && fromRpc.endsWith(KLARO_EMAIL_DOMAIN)) {
      setKlaroEmail(fromRpc);
      return fromRpc;
    }

    const { data: refreshedProfile } = await supabase
      .from("profiles")
      .select("klaro_email")
      .eq("user_id", userId)
      .maybeSingle();

    const refreshed = normalizeEmailAddress(refreshedProfile?.klaro_email);
    if (refreshed && refreshed.endsWith(KLARO_EMAIL_DOMAIN)) {
      setKlaroEmail(refreshed);
      return refreshed;
    }

    return null;
  }, [profile?.klaro_email, profile?.nachname, profile?.vorname, userId]);

  const loadDocSize = async (doc: Tables<"user_documents">) => {
    if (doc.size_bytes && doc.size_bytes > 0) return doc.size_bytes;

    const { data, error } = await supabase.storage.from("user-files").download(doc.file_path);
    if (error || !data) {
      throw new Error(`Datei konnte nicht geladen werden: ${doc.file_name ?? doc.file_path}`);
    }

    return data.size;
  };

  const tryReuseExistingDraft = async (jobId: string, lockedDisplayEmail: string | null) => {
    if (!userId) return false;

    const { data: existingDraft, error: draftError } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .eq("job_id", jobId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (draftError) {
      throw new Error(draftError.message);
    }

    if (!existingDraft) return false;

    const { data: existingAttachments, error: attachmentsError } = await supabase
      .from("application_attachments")
      .select("user_document_id, file_name, file_path, size_bytes")
      .eq("application_id", existingDraft.id)
      .order("created_at", { ascending: true });

    if (attachmentsError) {
      throw new Error(attachmentsError.message);
    }

    if (!existingAttachments || existingAttachments.length === 0) {
      return false;
    }

    const selectedFromDraft = new Set<string>();
    const mappedAttachments: AttachmentPreview[] = existingAttachments.map((item, index) => {
      if (item.user_document_id) {
        selectedFromDraft.add(item.user_document_id);
      }
      return {
        fileName: item.file_name ?? item.file_path.split("/").pop() ?? `Anhang ${index + 1}`,
        sizeBytes: item.size_bytes ?? 0,
        source: item.user_document_id ? "profile" : "generated",
      };
    });

    if (selectedFromDraft.size > 0) {
      setSelectedDocIds(selectedFromDraft);
    }

    setApplicationId(existingDraft.id);
    setSubject(existingDraft.subject ?? "");
    setMessageText(ensureLockedEmailFooter(existingDraft.message_text ?? "", lockedDisplayEmail));
    setPreparedAttachments(mappedAttachments);

    return true;
  };

  const handlePrepareApplication = async () => {
    if (!job) return;

    const nextUrl = `${location.pathname}?action=apply`;
    const rememberedLandingVariant = getRememberedExperimentVariant(
      LANDING_HERO_CTA_EXPERIMENT_ID
    );
    rememberApplyIntent({
      jobId: job.id,
      jobTitle: job.title,
      jobPath: nextUrl,
      source: "job_detail",
    });
    rememberCtaClick({
      source: "job_detail_prepare_button",
      destination: nextUrl,
      experimentId: LANDING_HERO_CTA_EXPERIMENT_ID,
      variant: rememberedLandingVariant,
    });

    if (!isAuthenticated || !userId) {
      toast({
        title: "Login erforderlich",
        description: "Bitte melden Sie sich an, um die Bewerbung zu starten.",
      });
      navigate(`/auth?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    if (!profile) {
      toast({
        title: "Profil unvollständig",
        description: "Bitte füllen Sie zuerst Ihr Profil aus.",
      });
      navigate(`/onboarding?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    const missingFields = getMissingFirstApplyFields(profile, sessionEmail);
    if (missingFields.length > 0) {
      toast({
        title: "Basisdaten fehlen",
        description: `Bitte ergänzen: ${missingFields.join(", ")}.`,
        variant: "destructive",
      });
      navigate(`/onboarding?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    setIsPreparing(true);
    setPrepareProgress(3);
    setPrepareProgressGoal(14);
    void logFunnelEvent(
      "funnel_prepare_start",
      {
        job_id: job.id,
        job_title: job.title,
        selected_profile_docs_count: selectedDocuments.length,
      },
      userId
    );

    try {
      const lockedKlaroEmail = await ensureKlaroEmailAddress();
      if (!lockedKlaroEmail) {
        throw new Error("Klaro E-Mail konnte nicht erstellt werden. Bitte versuchen Sie es erneut.");
      }
      setPrepareProgressGoal(24);

      const profileWithKlaroEmail = { ...profile, klaro_email: lockedKlaroEmail };
      // Use personal email if available, otherwise klaro email
      const lockedDisplayEmail = normalizeEmailAddress(profile?.email) || lockedKlaroEmail;

      const reusedDraft = await tryReuseExistingDraft(job.id, lockedDisplayEmail);
      setPrepareProgressGoal(34);
      if (reusedDraft) {
        setPrepareProgressGoal(100);
        setPrepareProgress(100);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 220));
        void logFunnelEvent(
          "funnel_prepare_success",
          {
            job_id: job.id,
            job_title: job.title,
            reused_draft: true,
            selected_profile_docs_count: selectedDocuments.length,
          },
          userId
        );
        toast({
          title: "Bestehender Entwurf geladen",
          description: "Diese Bewerbung wurde bereits vorbereitet. Bitte pruefen und senden.",
        });
        return;
      }

      setPrepareProgressGoal(42);

      const [cvResult, anschreibenResult] = await Promise.all([
        generateCV({
          profile: profileWithKlaroEmail,
          workExperiences,
          educationEntries,
          practicalExperiences,
          certifications,
          publications,
        }),
        generateAnschreiben({
          profile: profileWithKlaroEmail,
          workExperiences,
          educationEntries,
          practicalExperiences,
          certifications,
          publications,
          jobData: {
            krankenhaus: job.hospital_name,
            standort: job.location,
            fachabteilung: job.department,
            position: job.title,
            ansprechpartner: job.contact_name,
            anforderungen: job.requirements,
          },
        }),
      ]);
      setPrepareProgressGoal(58);

      if (!cvResult.success || !cvResult.html) {
        throw new Error(cvResult.error || "Lebenslauf konnte nicht generiert werden.");
      }

      if (!anschreibenResult.success || !anschreibenResult.html) {
        throw new Error(anschreibenResult.error || "Anschreiben konnte nicht generiert werden.");
      }

      const [cvSave, anschreibenSave] = await Promise.all([
        saveDocument({
          userId,
          typ: "CV",
          htmlContent: cvResult.html,
          showFoto: true,
          showSignatur: true,
        }),
        saveDocument({
          userId,
          typ: "Anschreiben",
          htmlContent: anschreibenResult.html,
          hospitalName: job.hospital_name,
          departmentOrSpecialty: job.department,
          positionTitle: job.title,
          jobUrl: job.apply_url,
          showFoto: false,
          showSignatur: true,
        }),
      ]);
      setPrepareProgressGoal(66);

      const [cvPdfBlob, anschreibenPdfBlob] = await Promise.all([
        generatePdfBlobFromServer({
          type: "cv",
          htmlContent: cvResult.html,
          showFoto: true,
          fotoUrl,
          showSignatur: true,
          signaturUrl,
          stadt: profileWithKlaroEmail.stadt,
          fileName: "Lebenslauf.pdf",
        }),
        generatePdfBlobFromServer({
          type: "anschreiben",
          htmlContent: anschreibenResult.html,
          showFoto: false,
          showSignatur: true,
          signaturUrl,
          stadt: profileWithKlaroEmail.stadt,
          fileName: "Anschreiben.pdf",
        }),
      ]);
      setPrepareProgressGoal(78);

      const selectedDocSizes = await Promise.all(selectedDocuments.map((doc) => loadDocSize(doc)));
      const selectedDocsTotal = selectedDocSizes.reduce((sum, size) => sum + size, 0);

      const totalBytes = cvPdfBlob.size + anschreibenPdfBlob.size + selectedDocsTotal;

      if (totalBytes > MAX_ATTACHMENT_BYTES) {
        throw new Error(
          `Ausgewaehlte Anhaenge sind ${humanFileSize(totalBytes)} gross. Maximal erlaubt sind 10 MB.`
        );
      }
      setPrepareProgressGoal(84);

      const fullName = `${profile.vorname ?? ""} ${profile.nachname ?? ""}`.trim() || "Bewerber/in";
      const defaultSubject = `Bewerbung als ${job.title}${job.hospital_name ? ` bei ${job.hospital_name}` : ""}`;
      const defaultText = ensureLockedEmailFooter(
        buildDefaultMessageText(job, fullName),
        lockedDisplayEmail
      );
      const defaultHtml = toEmailHtml(defaultText);

      // Use placeholder email if job has no contact_email (allows PDF download without sending)
      const recipientEmail = job.contact_email || "no-reply@klaro.tools";

      const { data: applicationRow, error: applicationError } = await supabase
        .from("applications")
        .insert({
          user_id: userId,
          job_id: job.id,
          status: "draft",
          recipient_email: recipientEmail,
          subject: defaultSubject,
          message_text: defaultText,
          message_html: defaultHtml,
          cv_document_id: cvSave.success ? cvSave.id ?? null : null,
          cover_letter_document_id: anschreibenSave.success ? anschreibenSave.id ?? null : null,
        })
        .select("*")
        .single();

      if (applicationError || !applicationRow) {
        throw new Error(applicationError?.message || "Bewerbung konnte nicht vorbereitet werden.");
      }
      setPrepareProgressGoal(90);

      const basePath = `${userId}/applications/${applicationRow.id}`;

      // Build filename parts for Nachname_Hospitalname pattern
      const nachnamePart = profile.nachname || "Arzt";
      const hospitalPart = job.hospital_name || "Stelle";

      const cvFileName = sanitizeFileName(`Lebenslauf_${nachnamePart}_${hospitalPart}.pdf`);
      const anschreibenFileName = sanitizeFileName(`Anschreiben_${nachnamePart}_${hospitalPart}.pdf`);
      const cvPath = `${basePath}/${cvFileName}`;
      const anschreibenPath = `${basePath}/${anschreibenFileName}`;

      const [{ error: cvUploadError }, { error: anschreibenUploadError }] = await Promise.all([
        supabase.storage
          .from("user-files")
          .upload(cvPath, cvPdfBlob, { upsert: true, contentType: "application/pdf" }),
        supabase.storage
          .from("user-files")
          .upload(anschreibenPath, anschreibenPdfBlob, { upsert: true, contentType: "application/pdf" }),
      ]);

      if (cvUploadError || anschreibenUploadError) {
        throw new Error(cvUploadError?.message || anschreibenUploadError?.message || "PDF Upload fehlgeschlagen");
      }
      setPrepareProgressGoal(95);

      const attachmentRows = [
        {
          application_id: applicationRow.id,
          user_document_id: null,
          file_path: cvPath,
          file_name: cvFileName,
          mime_type: "application/pdf",
          size_bytes: cvPdfBlob.size,
        },
        {
          application_id: applicationRow.id,
          user_document_id: null,
          file_path: anschreibenPath,
          file_name: anschreibenFileName,
          mime_type: "application/pdf",
          size_bytes: anschreibenPdfBlob.size,
        },
        ...selectedDocuments.map((doc) => ({
          application_id: applicationRow.id,
          user_document_id: doc.id,
          file_path: doc.file_path,
          file_name: doc.file_name ?? doc.title ?? "Dokument",
          mime_type: doc.mime_type ?? "application/pdf",
          size_bytes: doc.size_bytes,
        })),
      ];

      const { error: attachmentError } = await supabase.from("application_attachments").insert(attachmentRows);

      if (attachmentError) {
        throw new Error(attachmentError.message);
      }
      setPrepareProgressGoal(98);

      setApplicationId(applicationRow.id);
      setSubject(defaultSubject);
      setMessageText(defaultText);
      setPreparedAttachments([
        { fileName: cvFileName, sizeBytes: cvPdfBlob.size, source: "generated" },
        { fileName: anschreibenFileName, sizeBytes: anschreibenPdfBlob.size, source: "generated" },
        ...selectedDocuments.map((doc, index) => ({
          fileName: doc.file_name ?? doc.title ?? `Dokument ${index + 1}`,
          sizeBytes: doc.size_bytes ?? selectedDocSizes[index],
          source: "profile" as const,
        })),
      ]);
      void logFunnelEvent(
        "funnel_prepare_success",
        {
          application_id: applicationRow.id,
          job_id: job.id,
          job_title: job.title,
          recipient_email: job.contact_email,
          attachment_count: attachmentRows.length,
          attachment_total_bytes: totalBytes,
          selected_profile_docs_count: selectedDocuments.length,
          reused_draft: false,
        },
        userId
      );
      setPrepareProgressGoal(100);
      setPrepareProgress(100);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 220));

      toast({
        title: "Bewerbung vorbereitet",
        description: "Bitte pruefen Sie Betreff/Text und senden Sie dann manuell ab.",
      });
    } catch (error) {
      void logFunnelEvent(
        "funnel_prepare_failed",
        {
          job_id: job.id,
          job_title: job.title,
          error: error instanceof Error ? error.message : "unknown_error",
        },
        userId
      );
      toast({
        title: "Vorbereitung fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsPreparing(false);
    }
  };

  prepareApplicationRef.current = handlePrepareApplication;

  const handleSendApplication = async () => {
    if (!applicationId || !job) return;

    setIsSending(true);
    try {
      const finalText = ensureLockedEmailFooter(messageText, displayEmail);
      if (finalText !== messageText) {
        setMessageText(finalText);
      }
      const finalHtml = toEmailHtml(finalText);
      const result = await sendApplicationEmail({
        applicationId,
        subject,
        text: finalText,
        html: finalHtml,
      });

      if (!result.success) {
        throw new Error(result.error || "Versand fehlgeschlagen");
      }
      void logFunnelEvent(
        "funnel_send_success",
        {
          application_id: applicationId,
          job_id: job.id,
          job_title: job.title,
          recipient_email: job.contact_email,
        },
        userId
      );
      clearApplyIntent();
      clearPendingCtaClick();

      toast({
        title: "Bewerbung versendet",
        description: "Der Versand war erfolgreich. Antworten erscheinen in Ihrer Inbox.",
      });
      navigate("/inbox");
    } catch (error) {
      void logFunnelEvent(
        "funnel_send_failed",
        {
          application_id: applicationId,
          job_id: job.id,
          job_title: job.title,
          error: error instanceof Error ? error.message : "unknown_error",
        },
        userId
      );
      toast({
        title: "Versand fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadMergedPdf = async () => {
    if (!applicationId || !job || !profile) return;

    setIsDownloadingPdf(true);
    try {
      const result = await mergeApplicationPdfs({
        applicationId,
        hospitalName: job.hospital_name || undefined,
        nachname: profile.nachname || undefined,
      });

      if (!result.success || !result.blob) {
        throw new Error(result.error || "PDF konnte nicht erstellt werden");
      }

      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename || "Bewerbung.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF heruntergeladen",
        description: `Datei: ${result.filename}`,
      });
    } catch (error) {
      toast({
        title: "Download fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isSessionLoading || isLoading || (isAuthenticated && isProfileLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Job nicht gefunden</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/jobs">Zur Jobliste</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalAttachmentBytes = preparedAttachments.reduce((sum, item) => sum + item.sizeBytes, 0);

  const handleCopyLink = async () => {
    const url = `${baseUrl}${buildJobPath({ id: job.id, title: job.title, hospitalName: job.hospital_name })}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = `${baseUrl}${buildJobPath({ id: job.id, title: job.title, hospitalName: job.hospital_name })}`;
    const text = `${job.title}${job.hospital_name ? ` bei ${job.hospital_name}` : ""}${job.location ? ` in ${job.location}` : ""} – Jetzt bewerben: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const isNew = job.published_at ? (() => {
    const published = new Date(job.published_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return published >= sevenDaysAgo;
  })() : false;

  const expiringSoon = job.expires_at ? (() => {
    const expires = new Date(job.expires_at);
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
    return expires <= fourteenDaysFromNow && expires > new Date();
  })() : false;

  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
          <Link to="/dashboard" className="flex items-center gap-3">
            <BrandLogo />
          </Link>
          <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
            <Link to="/jobs">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Alle Stellen</span>
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          {job.hospital_name && (
            <>
              <span className="truncate max-w-[140px]">{job.hospital_name}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
          <span className="text-foreground font-medium truncate max-w-[200px]">{job.title}</span>
        </nav>

        <Card>
          <CardHeader className="pb-4">
            {/* Title with status badges */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <CardTitle className="text-2xl leading-snug">{job.title}</CardTitle>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 mt-1">
                {isNew && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs px-2 py-0.5">
                    Neu
                  </Badge>
                )}
                {expiringSoon && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs px-2 py-0.5">
                    <Clock className="h-3 w-3 mr-1" />
                    Bald ablaufend
                  </Badge>
                )}
              </div>
            </div>

            {/* Structured meta info */}
            <div className="space-y-1 mt-2">
              {job.hospital_name && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{job.hospital_name}</span>
                  {job.department && (
                    <>
                      <span className="text-border">·</span>
                      <span>{job.department}</span>
                    </>
                  )}
                </div>
              )}
              {job.location && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{job.location}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-1">
                Veröffentlicht: {formatDate(job.published_at)}
                {job.expires_at && ` · Bewerbungsfrist: ${formatDate(job.expires_at)}`}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Minimal Display Disclaimer - Copyright Protection */}
            <div className="rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    Urheberrechtlich geschützte Stellenanzeige
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                    Aus rechtlichen Gründen (Urheberrecht, Datenbankrechte) zeigen wir hier nur minimale Informationen.
                    Die <strong>vollständigen Details finden Sie in der Originalanzeige</strong> über den Link unten.
                  </p>
                </div>
              </div>
            </div>

            {job.tags && job.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag) => (
                  <Badge key={`${job.id}-${tag}`} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            {/* Source Attribution (Fair Use Compliance) */}
            {(job.source_url || job.source_name || job.apply_url) && (
              <div className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4">
                <div className="flex items-start gap-2">
                  <ExternalLink className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      📋 Vollständige Stellenanzeige ansehen
                    </p>
                    {job.source_name && (
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Quelle: <strong>{job.source_name}</strong>
                      </p>
                    )}
                    {(job.source_url || job.apply_url) && (
                      <a
                        href={job.source_url || job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Jetzt Originalanzeige beim Arbeitgeber öffnen
                      </a>
                    )}
                    <p className="text-xs text-amber-700 dark:text-amber-400 italic pt-1 border-t border-amber-200 dark:border-amber-800">
                      ⚠️ Klaro übernimmt keine Gewähr für Aktualität und Richtigkeit. Bitte prüfen Sie alle Details direkt beim Arbeitgeber.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {(job.apply_url || job.source_url) && (
                <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
                  <a href={job.apply_url || job.source_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Originalanzeige ansehen
                  </a>
                </Button>
              )}
              {job.contact_email ? (
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${job.contact_email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    {job.contact_email}
                  </a>
                </Button>
              ) : (
                <Badge variant="destructive">Keine Kontakt-E-Mail hinterlegt</Badge>
              )}

              {/* Share buttons */}
              <div className="flex items-center gap-1 ml-auto">
                <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-8 px-2">
                  {linkCopied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 text-xs hidden sm:inline">
                    {linkCopied ? "Kopiert" : "Link kopieren"}
                  </span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleShareWhatsApp} className="h-8 px-2">
                  <Share2 className="h-4 w-4" />
                  <span className="ml-1.5 text-xs hidden sm:inline">WhatsApp</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isAuthenticated ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mit Klaro bewerben</CardTitle>
              <CardDescription>
                Stellen sind öffentlich sichtbar. Zum Bewerben benötigen Sie ein Konto und ein Profil.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to={`/auth?next=${encodeURIComponent(applyNextUrl)}`}>Registrieren & bewerben</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/auth?next=${encodeURIComponent(applyNextUrl)}`}>Anmelden</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  Bewerbungsunterlagen
                  {userDocuments.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {userDocuments.length} {userDocuments.length === 1 ? 'Dokument' : 'Dokumente'}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Pflichtdokumente für Ihre Bewerbung (Approbation, Zertifikate, etc.). Diese werden zusammen mit CV und Anschreiben versendet. Maximal 10 MB insgesamt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {userDocuments.length > 0 ? (
                  <>
                    {userDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name ?? doc.title ?? doc.doc_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.doc_type}
                            {doc.size_bytes ? ` | ${humanFileSize(doc.size_bytes)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`doc-${doc.id}`} className="text-sm">
                            An Bewerbung anhängen
                          </Label>
                          <Checkbox
                            id={`doc-${doc.id}`}
                            checked={selectedDocIds.has(doc.id)}
                            onCheckedChange={(checked) => toggleSelectedDoc(doc.id, checked === true)}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">
                        <strong>Typischerweise benötigt:</strong> Approbationsurkunde, Arbeitszeugnisse, Facharzt-Diplom, Zertifikate, Sprachzertifikate
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Noch keine Bewerbungsunterlagen hochgeladen. Klicken Sie auf "Bewerbungsunterlagen hochladen", um wichtige Dokumente wie Approbation und Zertifikate hinzuzufügen.
                  </div>
                )}

                <Button asChild variant="outline" size="sm">
                  <Link to="/unterlagen">
                    {userDocuments.length === 0 ? (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Bewerbungsunterlagen hochladen
                      </>
                    ) : (
                      <>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Bewerbungsunterlagen verwalten
                      </>
                    )}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mit Klaro bewerben</CardTitle>
                <CardDescription>
                  CV und Anschreiben werden automatisch generiert. Versand erfolgt erst nach Ihrer manuellen Freigabe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handlePrepareApplication}
                  disabled={isPreparing || !isAuthenticated || !userId}
                >
                  {isPreparing ? (
                    <>
                      <span className="cook-emoji mr-2 inline-flex text-base leading-none">
                        {PREPARE_COOKING_EMOJIS[prepareEmojiIndex]}
                      </span>
                      <span className="mr-2 inline-flex h-4 items-end gap-1 text-primary-foreground/90">
                        {[0, 1, 2].map((dotIndex) => (
                          <span
                            key={dotIndex}
                            className="h-1.5 w-1.5 rounded-full bg-current animate-bounce"
                            style={{
                              animationDelay: `${dotIndex * 120}ms`,
                              animationDuration: "850ms",
                            }}
                          />
                        ))}
                      </span>
                      Bewerbung wird vorbereitet
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Bewerbung vorbereiten
                    </>
                  )}
                </Button>

                {/* Disclaimer about automatic detail extraction */}
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    ✅ <strong>Für Ihre Bewerbung:</strong> Wenn Sie auf "Bewerbung vorbereiten" klicken, ruft unser System
                    automatisch alle Details von der Originalquelle ab und erstellt ein individuelles, hochwertiges Anschreiben
                    für Sie – ohne dass Sie die Stellenanzeige manuell kopieren müssen.
                  </p>
                </div>

                {isPreparing ? (
                  <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="cook-emoji inline-flex text-sm leading-none">
                        {PREPARE_COOKING_EMOJIS[prepareEmojiIndex]}
                      </span>
                      <p className="text-xs font-medium text-primary leading-tight">
                        {PREPARE_LOADING_STEPS[prepareStepIndex]}
                      </p>
                      <span className="ml-auto text-xs font-semibold text-primary">
                        {Math.round(prepareProgress)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/20">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                        style={{ width: `${prepareProgress}%` }}
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {PREPARE_LOADING_STEPS.map((step, stepIndex) => (
                        <span
                          key={step}
                          className={`h-1.5 rounded-full transition-colors ${
                            stepIndex <= prepareStepIndex ? "bg-primary" : "bg-primary/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {applicationId ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Manuelle Freigabe</CardTitle>
                  <CardDescription>
                    Pruefen Sie den E-Mail-Text und senden Sie dann die Bewerbung an {job.contact_email}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="application-subject">Betreff</Label>
                    <Input
                      id="application-subject"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="application-message">Nachricht</Label>
                    <Textarea
                      id="application-message"
                      rows={10}
                      value={messageText}
                      onChange={(event) =>
                        setMessageText(ensureLockedEmailFooter(event.target.value, displayEmail))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Die Kontakt E-Mail am Ende ist fest hinterlegt und kann nicht entfernt werden.
                    </p>
                  </div>

                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-sm font-medium">Anhaenge ({preparedAttachments.length})</p>
                    {preparedAttachments.map((item, index) => (
                      <div key={`${item.fileName}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                        <div className="inline-flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.fileName}</span>
                          <Badge variant="secondary" className="shrink-0">{item.source === "generated" ? "Klaro" : "Profil"}</Badge>
                          <span className="text-xs text-muted-foreground shrink-0">{humanFileSize(item.sizeBytes)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 shrink-0"
                          onClick={async () => {
                            // Download individual file
                            try {
                              const attachment = preparedAttachments[index];
                              if (!attachment) return;

                              // For generated files, we need to get them from the application attachments
                              const { data: attachmentData } = await supabase
                                .from('application_attachments')
                                .select('file_path')
                                .eq('application_id', applicationId!)
                                .eq('file_name', attachment.fileName)
                                .maybeSingle();

                              if (!attachmentData?.file_path) {
                                throw new Error('Datei nicht gefunden');
                              }

                              const { data: fileBlob, error: downloadError } = await supabase
                                .storage
                                .from('user-files')
                                .download(attachmentData.file_path);

                              if (downloadError || !fileBlob) {
                                throw new Error('Download fehlgeschlagen');
                              }

                              // Create download link
                              const url = URL.createObjectURL(fileBlob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = attachment.fileName;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);

                              toast({
                                title: 'Datei heruntergeladen',
                                description: attachment.fileName,
                              });
                            } catch (error) {
                              toast({
                                title: 'Download fehlgeschlagen',
                                description: error instanceof Error ? error.message : 'Unbekannter Fehler',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground pt-1 border-t">
                      Gesamtgroesse: {humanFileSize(totalAttachmentBytes)} / {humanFileSize(MAX_ATTACHMENT_BYTES)}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Tipp:</strong> Klicken Sie auf <Download className="h-3 w-3 inline" /> neben einzelnen Dateien für separate Downloads,
                    oder laden Sie alle zusammengefügt herunter.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleDownloadMergedPdf}
                      disabled={isDownloadingPdf}
                      variant="outline"
                      className="flex-1"
                    >
                      {isDownloadingPdf ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Alle zusammengefügt herunterladen
                    </Button>
                    <Button
                      onClick={handleSendApplication}
                      disabled={isSending || !subject.trim() || !messageText.trim() || !job.contact_email}
                      className="flex-1"
                    >
                      {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {job.contact_email ? "Bewerbung jetzt senden" : "Keine E-Mail verfügbar"}
                    </Button>
                  </div>

                  {!job.contact_email && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        ⚠️ <strong>Hinweis:</strong> Diese Stelle hat keine Kontakt-E-Mail hinterlegt. Sie können Ihre Bewerbung
                        trotzdem vorbereiten und als PDF herunterladen, aber nicht direkt über Klaro versenden.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default JobDetailPage;
