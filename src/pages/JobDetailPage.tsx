import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { isCvFresh, getMostRecentProfileUpdate } from "@/lib/cv-freshness";
import { useToast } from "@/hooks/use-toast";
import { useUserFileUrl, resolveUserFilePath } from "@/hooks/useUserFileUrl";
import { getMissingFirstApplyFields } from "@/lib/first-apply";
import { applySeoMeta } from "@/lib/seo";
import { buildJobPath } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";

import JobsNavBar from "@/components/jobs/JobsNavBar";
import JobDetailHeader from "@/components/job-detail/JobDetailHeader";
import JobDetailDescription from "@/components/job-detail/JobDetailDescription";
import JobDetailAuthGate from "@/components/job-detail/JobDetailAuthGate";
import ApplicationStepIndicator from "@/components/job-detail/ApplicationStepIndicator";
import DocumentSelector from "@/components/job-detail/DocumentSelector";
import PrepareApplicationCard from "@/components/job-detail/PrepareApplicationCard";
import ApplicationReviewCard from "@/components/job-detail/ApplicationReviewCard";
import type { AttachmentPreview } from "@/components/job-detail/ApplicationReviewCard";
import JobDetailSkeleton from "@/components/job-detail/JobDetailSkeleton";
import JobDetailNotFound from "@/components/job-detail/JobDetailNotFound";

// --- Utility functions ---

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

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

// --- Component ---

const JobDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saveDocument, getLatestDocument } = useDocumentVersions();

  // --- State ---
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
  const prepareProgressTargetRef = useRef(0);

  const [job, setJob] = useState<Tables<"jobs"> | null>(null);
  const [userDocuments, setUserDocuments] = useState<Tables<"user_documents">[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [klaroEmail, setKlaroEmail] = useState<string | null>(null);
  const [preparedAttachments, setPreparedAttachments] = useState<AttachmentPreview[]>([]);
  const [hasHandledApplyIntent, setHasHandledApplyIntent] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; fileName: string } | null>(null);
  const prepareApplicationRef = useRef<() => Promise<void>>(async () => {});

  const {
    profile,
    workExperiences,
    educationEntries,
    practicalExperiences,
    certifications,
    publications,
    customSections,
    customSectionEntries,
    isLoading: isProfileLoading,
    userId,
  } = useProfile();

  const { url: fotoUrl } = useUserFileUrl(profile?.foto_url);
  const { url: signaturUrl } = useUserFileUrl(profile?.signatur_url);

  const personalEmail = useMemo(() => normalizeEmailAddress(profile?.email), [profile?.email]);
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

  // --- Effects ---

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
      return;
    }
    setPrepareProgress(3);
    setPrepareProgressGoal(12);

    const stepInterval = window.setInterval(() => {
      setPrepareStepIndex((prev) => (prev + 1) % 4);
    }, 1400);
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
      toast({ title: "Dokumente konnten nicht geladen werden", description: error.message, variant: "destructive" });
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

  // --- SEO ---
  useEffect(() => {
    const canonicalUrl = job
      ? `${baseUrl}${buildJobPath({ id: job.id, title: job.title, hospitalName: job.hospital_name })}`
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
      applicantLocationRequirements: { "@type": "Country", name: "Deutschland" },
      url: canonicalUrl,
      directApply: true,
    };

    if (job.contact_email) {
      jobPostingJsonLd.applicationContact = { "@type": "ContactPoint", email: job.contact_email };
    } else if (job.apply_url) {
      jobPostingJsonLd.applicationContact = { "@type": "ContactPoint", url: job.apply_url };
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

  // --- Apply intent ---
  useEffect(() => {
    if (!applyIntentActive || hasHandledApplyIntent || isSessionLoading || isLoading || !job) return;

    if (!isAuthenticated) {
      setHasHandledApplyIntent(true);
      rememberApplyIntent({ jobId: job.id, jobTitle: job.title, jobPath: applyNextUrl, source: "job_detail" });
      navigate(`/auth?next=${encodeURIComponent(applyNextUrl)}`, { replace: true });
      return;
    }

    if (!userId || isProfileLoading) return;

    if (!profile) {
      setHasHandledApplyIntent(true);
      navigate(`/onboarding?next=${encodeURIComponent(applyNextUrl)}`, { replace: true });
      return;
    }

    setHasHandledApplyIntent(true);
    void prepareApplicationRef.current();
  }, [
    applyIntentActive, applyNextUrl, hasHandledApplyIntent, isAuthenticated,
    isLoading, isProfileLoading, isSessionLoading, job, navigate, profile, userId,
  ]);

  // --- Helpers ---

  const selectedDocuments = useMemo(
    () => userDocuments.filter((doc) => selectedDocIds.has(doc.id)),
    [selectedDocIds, userDocuments]
  );

  const toggleSelectedDoc = (docId: string, checked: boolean) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(docId);
      else next.delete(docId);
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

    const { data: provisionedEmail, error: provisionError } = await supabase.rpc(
      "provision_user_alias",
      { p_user_id: userId, p_vorname: profile?.vorname ?? "", p_nachname: profile?.nachname ?? "" }
    );
    if (provisionError) console.error("Failed to provision klaro alias", provisionError);

    const fromRpc = typeof provisionedEmail === "string" ? normalizeEmailAddress(provisionedEmail) : null;
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
    if (error || !data) throw new Error(`Datei konnte nicht geladen werden: ${doc.file_name ?? doc.file_path}`);
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
    if (draftError) throw new Error(draftError.message);
    if (!existingDraft) return false;

    const { data: existingAttachments, error: attachmentsError } = await supabase
      .from("application_attachments")
      .select("user_document_id, file_name, file_path, size_bytes")
      .eq("application_id", existingDraft.id)
      .order("created_at", { ascending: true });
    if (attachmentsError) throw new Error(attachmentsError.message);
    if (!existingAttachments || existingAttachments.length === 0) return false;

    const selectedFromDraft = new Set<string>();
    const mappedAttachments: AttachmentPreview[] = existingAttachments.map((item, index) => {
      if (item.user_document_id) selectedFromDraft.add(item.user_document_id);
      return {
        fileName: item.file_name ?? item.file_path.split("/").pop() ?? `Anhang ${index + 1}`,
        sizeBytes: item.size_bytes ?? 0,
        source: item.user_document_id ? "profile" : "generated",
      };
    });
    if (selectedFromDraft.size > 0) setSelectedDocIds(selectedFromDraft);

    setApplicationId(existingDraft.id);
    setSubject(existingDraft.subject ?? "");
    setMessageText(ensureLockedEmailFooter(existingDraft.message_text ?? "", lockedDisplayEmail));
    setPreparedAttachments(mappedAttachments);
    return true;
  };

  // --- Core handlers ---

  const handlePrepareApplication = async () => {
    if (!job) return;

    const nextUrl = `${location.pathname}?action=apply`;
    const rememberedLandingVariant = getRememberedExperimentVariant(LANDING_HERO_CTA_EXPERIMENT_ID);
    rememberApplyIntent({ jobId: job.id, jobTitle: job.title, jobPath: nextUrl, source: "job_detail" });
    rememberCtaClick({
      source: "job_detail_prepare_button",
      destination: nextUrl,
      experimentId: LANDING_HERO_CTA_EXPERIMENT_ID,
      variant: rememberedLandingVariant,
    });

    if (!isAuthenticated || !userId) {
      toast({ title: "Login erforderlich", description: "Bitte melden Sie sich an, um die Bewerbung zu starten." });
      navigate(`/auth?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    if (!profile) {
      toast({ title: "Profil unvollständig", description: "Bitte füllen Sie zuerst Ihr Profil aus." });
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
      { job_id: job.id, job_title: job.title, selected_profile_docs_count: selectedDocuments.length },
      userId
    );

    try {
      const lockedKlaroEmail = await ensureKlaroEmailAddress();
      if (!lockedKlaroEmail) {
        throw new Error("Klaro E-Mail konnte nicht erstellt werden. Bitte versuchen Sie es erneut.");
      }
      setPrepareProgressGoal(24);

      const profileWithKlaroEmail = { ...profile, klaro_email: lockedKlaroEmail };
      const lockedDisplayEmail = normalizeEmailAddress(profile?.email) || lockedKlaroEmail;

      const reusedDraft = await tryReuseExistingDraft(job.id, lockedDisplayEmail);
      setPrepareProgressGoal(34);
      if (reusedDraft) {
        setPrepareProgressGoal(100);
        setPrepareProgress(100);
        await new Promise<void>((r) => window.setTimeout(r, 220));
        void logFunnelEvent(
          "funnel_prepare_success",
          { job_id: job.id, job_title: job.title, reused_draft: true, selected_profile_docs_count: selectedDocuments.length },
          userId
        );
        toast({ title: "Bestehender Entwurf geladen", description: "Diese Bewerbung wurde bereits vorbereitet." });
        return;
      }

      setPrepareProgressGoal(42);

      let cvHtmlToUse: string | null = null;
      let cvWasReused = false;
      let existingCvId: string | null = null;

      const existingCv = await getLatestDocument(userId, "CV");
      setPrepareProgressGoal(48);

      if (existingCv) {
        const cvCreatedAt = new Date(existingCv.created_at);
        const profileData = {
          profile: profileWithKlaroEmail,
          workExperiences,
          educationEntries,
          practicalExperiences,
          certifications,
          publications,
          customSections,
          customSectionEntries,
        };
        if (isCvFresh(cvCreatedAt, profileData)) {
          cvHtmlToUse = existingCv.html_content;
          cvWasReused = true;
          existingCvId = existingCv.id;
        }
      }

      setPrepareProgressGoal(52);

      const generatePromises: Promise<any>[] = [
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
      ];

      let cvResult: { success: boolean; html?: string; error?: string };
      if (!cvWasReused) {
        generatePromises.push(
          generateCV({
            profile: profileWithKlaroEmail,
            workExperiences,
            educationEntries,
            practicalExperiences,
            certifications,
            publications,
          })
        );
      }

      const results = await Promise.all(generatePromises);
      const anschreibenResult = results[0];
      cvResult = cvWasReused ? { success: true, html: cvHtmlToUse! } : results[1];
      setPrepareProgressGoal(58);

      if (!cvResult.success || !cvResult.html) {
        throw new Error(cvResult.error || "Lebenslauf konnte nicht generiert werden.");
      }
      if (!anschreibenResult.success || !anschreibenResult.html) {
        throw new Error(anschreibenResult.error || "Anschreiben konnte nicht generiert werden.");
      }

      const savePromises: Promise<any>[] = [
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
      ];

      let cvSave: { success: boolean; id?: string };
      if (cvWasReused) {
        cvSave = { success: true, id: existingCvId! };
      } else {
        savePromises.push(
          saveDocument({ userId, typ: "CV", htmlContent: cvResult.html, showFoto: true, showSignatur: true })
        );
      }

      const saveResults = await Promise.all(savePromises);
      const anschreibenSave = saveResults[0];
      if (!cvWasReused) cvSave = saveResults[1];
      setPrepareProgressGoal(66);

      if (!cvSave!.success || !cvSave!.id) throw new Error("Lebenslauf konnte nicht gespeichert werden.");
      if (!anschreibenSave.success || !anschreibenSave.id) throw new Error("Anschreiben konnte nicht gespeichert werden.");

      // Resolve fresh signed URLs for foto and signatur directly from storage.
      // The useUserFileUrl hook resolves asynchronously and may still be null
      // when this function runs (e.g. auto-apply after auth redirect).
      const resolveSignedUrl = async (rawValue: string | null | undefined): Promise<string | null> => {
        if (!rawValue) return null;
        const storagePath = resolveUserFilePath(rawValue);
        if (!storagePath) return rawValue; // already a full URL
        const { data } = await supabase.storage.from("user-files").createSignedUrl(storagePath, 3600);
        return data?.signedUrl ?? null;
      };

      const [resolvedFotoUrl, resolvedSignaturUrl] = await Promise.all([
        resolveSignedUrl(profile.foto_url),
        resolveSignedUrl(profile.signatur_url),
      ]);

      const [cvPdfBlob, anschreibenPdfBlob] = await Promise.all([
        generatePdfBlobFromServer({
          type: "cv",
          htmlContent: cvResult.html,
          showFoto: true,
          fotoUrl: resolvedFotoUrl,
          showSignatur: true,
          signaturUrl: resolvedSignaturUrl,
          stadt: profileWithKlaroEmail.stadt,
          fileName: "Lebenslauf.pdf",
        }),
        generatePdfBlobFromServer({
          type: "anschreiben",
          htmlContent: anschreibenResult.html,
          showFoto: false,
          showSignatur: true,
          signaturUrl: resolvedSignaturUrl,
          stadt: profileWithKlaroEmail.stadt,
          fileName: "Anschreiben.pdf",
        }),
      ]);
      setPrepareProgressGoal(78);

      const selectedDocSizes = await Promise.all(selectedDocuments.map((doc) => loadDocSize(doc)));
      const selectedDocsTotal = selectedDocSizes.reduce((sum, size) => sum + size, 0);
      const totalBytes = cvPdfBlob.size + anschreibenPdfBlob.size + selectedDocsTotal;
      if (totalBytes > MAX_ATTACHMENT_BYTES) {
        throw new Error(`Ausgewaehlte Anhaenge sind ${humanFileSize(totalBytes)} gross. Maximal erlaubt sind 10 MB.`);
      }
      setPrepareProgressGoal(84);

      const fullName = `${profile.vorname ?? ""} ${profile.nachname ?? ""}`.trim() || "Bewerber/in";
      const defaultSubject = `Bewerbung als ${job.title}${job.hospital_name ? ` bei ${job.hospital_name}` : ""}`;
      const defaultText = ensureLockedEmailFooter(buildDefaultMessageText(job, fullName), lockedDisplayEmail);
      const defaultHtml = toEmailHtml(defaultText);

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
          cv_document_id: cvSave!.success ? cvSave!.id ?? null : null,
          cover_letter_document_id: anschreibenSave.success ? anschreibenSave.id ?? null : null,
        })
        .select("*")
        .single();
      if (applicationError || !applicationRow) {
        throw new Error(applicationError?.message || "Bewerbung konnte nicht vorbereitet werden.");
      }
      setPrepareProgressGoal(90);

      const basePath = `${userId}/applications/${applicationRow.id}`;
      const nachnamePart = profile.nachname || "Arzt";
      const hospitalPart = job.hospital_name || "Stelle";
      const cvFileName = sanitizeFileName(`Lebenslauf_${nachnamePart}_${hospitalPart}.pdf`);
      const anschreibenFileName = sanitizeFileName(`Anschreiben_${nachnamePart}_${hospitalPart}.pdf`);
      const cvPath = `${basePath}/${cvFileName}`;
      const anschreibenPath = `${basePath}/${anschreibenFileName}`;

      const [{ error: cvUploadError }, { error: anschreibenUploadError }] = await Promise.all([
        supabase.storage.from("user-files").upload(cvPath, cvPdfBlob, { upsert: true, contentType: "application/pdf" }),
        supabase.storage.from("user-files").upload(anschreibenPath, anschreibenPdfBlob, { upsert: true, contentType: "application/pdf" }),
      ]);
      if (cvUploadError || anschreibenUploadError) {
        throw new Error(cvUploadError?.message || anschreibenUploadError?.message || "PDF Upload fehlgeschlagen");
      }
      setPrepareProgressGoal(95);

      const attachmentRows = [
        { application_id: applicationRow.id, user_document_id: null, file_path: cvPath, file_name: cvFileName, mime_type: "application/pdf", size_bytes: cvPdfBlob.size },
        { application_id: applicationRow.id, user_document_id: null, file_path: anschreibenPath, file_name: anschreibenFileName, mime_type: "application/pdf", size_bytes: anschreibenPdfBlob.size },
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
      if (attachmentError) throw new Error(attachmentError.message);
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

      void logFunnelEvent("funnel_prepare_success", {
        application_id: applicationRow.id,
        job_id: job.id,
        job_title: job.title,
        recipient_email: job.contact_email,
        attachment_count: attachmentRows.length,
        attachment_total_bytes: totalBytes,
        selected_profile_docs_count: selectedDocuments.length,
        reused_draft: false,
        cv_reused: cvWasReused,
      }, userId);

      setPrepareProgressGoal(100);
      setPrepareProgress(100);
      await new Promise<void>((r) => window.setTimeout(r, 220));
      toast({
        title: "Bewerbung vorbereitet",
        description: cvWasReused
          ? "Bestehender CV wiederverwendet. Anschreiben neu generiert."
          : "CV und Anschreiben wurden generiert.",
      });
    } catch (error) {
      void logFunnelEvent("funnel_prepare_failed", {
        job_id: job.id,
        job_title: job.title,
        error: error instanceof Error ? error.message : "unknown_error",
      }, userId);
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
      if (finalText !== messageText) setMessageText(finalText);
      const result = await sendApplicationEmail({
        applicationId,
        subject,
        text: finalText,
        html: toEmailHtml(finalText),
      });
      if (!result.success) throw new Error(result.error || "Versand fehlgeschlagen");

      void logFunnelEvent("funnel_send_success", {
        application_id: applicationId,
        job_id: job.id,
        job_title: job.title,
        recipient_email: job.contact_email,
      }, userId);
      clearApplyIntent();
      clearPendingCtaClick();
      toast({ title: "Bewerbung versendet", description: "Der Versand war erfolgreich. Antworten erscheinen in Ihrer Inbox." });
      navigate("/inbox");
    } catch (error) {
      void logFunnelEvent("funnel_send_failed", {
        application_id: applicationId,
        job_id: job.id,
        job_title: job.title,
        error: error instanceof Error ? error.message : "unknown_error",
      }, userId);
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
      if (!result.success || !result.blob) throw new Error(result.error || "PDF konnte nicht erstellt werden");
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename || "Bewerbung.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "PDF heruntergeladen", description: `Datei: ${result.filename}` });
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

  const handlePreviewFile = async (index: number) => {
    try {
      const attachment = preparedAttachments[index];
      if (!attachment || !applicationId) return;
      const { data: attachmentData } = await supabase
        .from("application_attachments")
        .select("file_path")
        .eq("application_id", applicationId)
        .eq("file_name", attachment.fileName)
        .maybeSingle();
      if (!attachmentData?.file_path) throw new Error("Datei nicht gefunden");
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("user-files")
        .download(attachmentData.file_path);
      if (downloadError || !fileBlob) throw new Error("Vorschau fehlgeschlagen");
      const url = URL.createObjectURL(fileBlob);
      setPreviewFile({ url, fileName: attachment.fileName });
    } catch (error) {
      toast({
        title: "Vorschau fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (index: number) => {
    try {
      const attachment = preparedAttachments[index];
      if (!attachment || !applicationId) return;
      const { data: attachmentData } = await supabase
        .from("application_attachments")
        .select("file_path")
        .eq("application_id", applicationId)
        .eq("file_name", attachment.fileName)
        .maybeSingle();
      if (!attachmentData?.file_path) throw new Error("Datei nicht gefunden");
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("user-files")
        .download(attachmentData.file_path);
      if (downloadError || !fileBlob) throw new Error("Download fehlgeschlagen");
      const url = URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Datei heruntergeladen", description: attachment.fileName });
    } catch (error) {
      toast({
        title: "Download fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  // --- Render ---

  if (isSessionLoading || isLoading || (isAuthenticated && isProfileLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <JobsNavBar isAuthenticated={isAuthenticated} backLink={{ to: "/jobs", label: "Alle Stellen" }} />
        <JobDetailSkeleton />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <JobsNavBar isAuthenticated={isAuthenticated} backLink={{ to: "/jobs", label: "Alle Stellen" }} />
        <JobDetailNotFound />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <JobsNavBar isAuthenticated={isAuthenticated} backLink={{ to: "/jobs", label: "Alle Stellen" }} />

      <div className="container mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          {/* Left column: Job content */}
          <div className="lg:col-span-2 space-y-4">
            <JobDetailHeader
              job={job}
              baseUrl={baseUrl}
              isAuthenticated={isAuthenticated}
              onPrepareClick={handlePrepareApplication}
              isPreparing={isPreparing}
              applyNextUrl={applyNextUrl}
            />

            <JobDetailDescription job={job} />

            {/* Disclaimer */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Klaro übernimmt keine Gewähr für Aktualität und Richtigkeit. Bitte prüfen Sie alle Details direkt beim Arbeitgeber.
              </p>
            </div>
          </div>

          {/* Right column: Application sidebar */}
          <div className="mt-6 lg:mt-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            {!isAuthenticated ? (
              <JobDetailAuthGate applyNextUrl={applyNextUrl} />
            ) : (
              <>
                {/* Step indicator */}
                <div className="bg-background rounded-lg border p-4">
                  <ApplicationStepIndicator
                    hasDocuments={userDocuments.length > 0}
                    isPrepared={!!applicationId}
                    isPreparing={isPreparing}
                  />
                </div>

                <DocumentSelector
                  userDocuments={userDocuments}
                  selectedDocIds={selectedDocIds}
                  onToggleDoc={toggleSelectedDoc}
                />

                <PrepareApplicationCard
                  onPrepare={handlePrepareApplication}
                  isPreparing={isPreparing}
                  isDisabled={!isAuthenticated || !userId}
                  hasContactEmail={!!job.contact_email}
                  prepareStepIndex={prepareStepIndex}
                  prepareProgress={prepareProgress}
                />

                {applicationId && (
                  <ApplicationReviewCard
                    job={job}
                    subject={subject}
                    onSubjectChange={setSubject}
                    messageText={messageText}
                    onMessageChange={(value) =>
                      setMessageText(ensureLockedEmailFooter(value, displayEmail))
                    }
                    preparedAttachments={preparedAttachments}
                    isSending={isSending}
                    isDownloadingPdf={isDownloadingPdf}
                    onSend={handleSendApplication}
                    onDownloadMerged={handleDownloadMergedPdf}
                    onPreviewFile={handlePreviewFile}
                    onDownloadFile={handleDownloadFile}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none gap-0 p-0 rounded-none sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[90vw] sm:h-[90vh] sm:max-w-[90vw] sm:max-h-[90vh] sm:rounded-lg">
          <DialogHeader className="p-3 sm:p-4 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg truncate pr-16">{previewFile?.fileName}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 absolute right-12 top-3 sm:top-4"
                onClick={() => {
                  if (previewFile) {
                    const link = document.createElement("a");
                    link.href = previewFile.url;
                    link.download = previewFile.fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast({ title: "Datei heruntergeladen", description: previewFile.fileName });
                  }
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="min-h-0 overflow-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            {previewFile && (
              <iframe
                src={previewFile.url}
                className="w-full h-[calc(100dvh-56px)] sm:h-[calc(90vh-56px)] border-0"
                title={previewFile.fileName}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetailPage;
