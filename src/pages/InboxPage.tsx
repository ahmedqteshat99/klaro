import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { replyApplicationEmail } from "@/lib/api/applications";
import { logFunnelEvent } from "@/lib/app-events";
import { useToast } from "@/hooks/use-toast";
import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  Link2,
  Loader2,
  Mail,
  MailCheck,
  MailQuestion,
  MailWarning,
  Paperclip,
  Send,
  Upload,
  X,
} from "lucide-react";

const MAX_REPLY_ATTACHMENTS_BYTES = 10 * 1024 * 1024;

type ReplyAttachmentDraft = {
  id: string;
  file: File;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type UploadedReplyAttachment = {
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type LastMessage = {
  text: string;
  createdAt: string;
  direction: string;
};

type DecoratedMessage =
  | { kind: "separator"; key: string; label: string }
  | { kind: "message"; key: string; message: Tables<"application_messages"> };

type MessageBodyParts = {
  visibleText: string;
  quotedText: string;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTime = (value: string | null) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return formatTime(value);
  if (isYesterday) return "Gestern";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
};

const formatMessageDayLabel = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today) return "Heute";
  if (date.toDateString() === yesterday.toDateString()) return "Gestern";

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const statusLabel = (status: string) => {
  switch (status) {
    case "queued":
      return "Warteschlange";
    case "sent":
      return "Gesendet";
    case "replied":
      return "Antwort erhalten";
    case "failed":
      return "Fehlgeschlagen";
    default:
      return status;
  }
};

const statusBadgeClass = (status: string) => {
  if (status === "replied") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "sent" || status === "queued") return "bg-blue-100 text-blue-700 border-blue-200";
  if (status === "failed") return "bg-red-100 text-red-700 border-red-200";
  return "bg-muted text-muted-foreground";
};

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, "_");

const humanFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const messagePreview = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);

const unreadBadgeLabel = (count: number) => {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return `${count}+`;
};

const splitQuotedBody = (value: string | null | undefined): MessageBodyParts => {
  const normalized = (value ?? "").replace(/\r\n/g, "\n");
  if (!normalized.trim()) {
    return { visibleText: "", quotedText: "" };
  }

  const lines = normalized.split("\n");
  let markerLineIndex = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i].trim();
    const next = (lines[i + 1] ?? "").trim().toLowerCase();
    const currentLower = current.toLowerCase();

    const isEnglishReplyHeader =
      current.startsWith("On ") &&
      (currentLower.includes(" wrote:") || next === "wrote:");
    const isGermanReplyHeader =
      current.startsWith("Am ") &&
      (currentLower.includes(" schrieb") || next.startsWith("schrieb"));
    const isOriginalMessageDivider = /^-+\s*Original Message\s*-+$/i.test(current);
    const isUnderscoreDivider = /^_{6,}$/.test(current);

    if (isEnglishReplyHeader || isGermanReplyHeader || isOriginalMessageDivider || isUnderscoreDivider) {
      markerLineIndex = i;
      break;
    }
  }

  let markerIndex = -1;
  if (markerLineIndex >= 0) {
    markerIndex = lines.slice(0, markerLineIndex).join("\n").length;
    if (markerLineIndex > 0) markerIndex += 1;
  }

  if (markerIndex < 0) {
    const quotedLineIndex = lines.findIndex((line) => line.trimStart().startsWith(">"));
    if (quotedLineIndex > 0) {
      const visible = lines.slice(0, quotedLineIndex).join("\n").trimEnd();
      const quoted = lines.slice(quotedLineIndex).join("\n").trim();
      if (visible.trim()) {
        return { visibleText: visible, quotedText: quoted };
      }
    }

    return { visibleText: normalized.trim(), quotedText: "" };
  }

  const visibleText = normalized.slice(0, markerIndex).trimEnd();
  const quotedText = normalized.slice(markerIndex).trim();

  if (!visibleText.trim()) {
    return { visibleText: normalized.trim(), quotedText: "" };
  }

  return { visibleText, quotedText };
};

const InboxPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyAttachmentInputRef = useRef<HTMLInputElement>(null);
  const selectedApplicationIdRef = useRef<string | null>(null);

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [applications, setApplications] = useState<Tables<"applications">[]>([]);
  const [jobsMap, setJobsMap] = useState<
    Record<string, Pick<Tables<"jobs">, "id" | "title" | "hospital_name">>
  >({});
  const [messages, setMessages] = useState<Tables<"application_messages">[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessageMap, setLastMessageMap] = useState<Record<string, LastMessage>>({});
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<ReplyAttachmentDraft[]>([]);
  const [mobileView, setMobileView] = useState<"list" | "messages">("list");
  const [expandedQuotedIds, setExpandedQuotedIds] = useState<string[]>([]);
  const [unlinkedMessages, setUnlinkedMessages] = useState<Tables<"application_messages">[]>([]);
  const [reassigningMessageId, setReassigningMessageId] = useState<string | null>(null);

  const loadUnreadCounts = useCallback(async (applicationIds: string[]) => {
    if (applicationIds.length === 0) {
      setUnreadCounts({});
      return;
    }

    const { data, error } = await supabase
      .from("application_messages")
      .select("application_id")
      .in("application_id", applicationIds)
      .eq("direction", "inbound")
      .eq("is_read", false);

    if (error || !data) {
      setUnreadCounts({});
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.application_id] = (counts[row.application_id] ?? 0) + 1;
    }
    setUnreadCounts(counts);
  }, []);

  const loadLastMessages = useCallback(async (applicationIds: string[]) => {
    if (applicationIds.length === 0) {
      setLastMessageMap({});
      return;
    }

    const { data } = await supabase
      .from("application_messages")
      .select("application_id, text_body, created_at, direction")
      .in("application_id", applicationIds)
      .order("created_at", { ascending: false });

    const next: Record<string, LastMessage> = {};
    for (const row of data ?? []) {
      if (!next[row.application_id]) {
        next[row.application_id] = {
          text: messagePreview(row.text_body),
          createdAt: row.created_at,
          direction: row.direction,
        };
      }
    }
    setLastMessageMap(next);
  }, []);

  const loadUnlinkedMessages = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("application_messages")
      .select("*")
      .eq("user_id", uid)
      .is("application_id", null)
      .order("created_at", { ascending: false });

    setUnlinkedMessages(data ?? []);
  }, []);

  const loadApplications = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);

    const { data: applicationsData, error: applicationsError } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "draft")
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (applicationsError) {
      setApplications([]);
      setJobsMap({});
      setSelectedApplicationId(null);
      setIsLoading(false);
      return;
    }

    const nextApps = applicationsData ?? [];
    setApplications(nextApps);

    setSelectedApplicationId((prev) => {
      if (!prev && nextApps.length > 0) return nextApps[0].id;
      if (prev && nextApps.some((app) => app.id === prev)) return prev;
      return nextApps[0]?.id ?? null;
    });

    const jobIds = Array.from(new Set(nextApps.map((app) => app.job_id)));
    if (jobIds.length > 0) {
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title, hospital_name")
        .in("id", jobIds);

      const mapped = (jobsData ?? []).reduce<
        Record<string, Pick<Tables<"jobs">, "id" | "title" | "hospital_name">>
      >((acc, job) => {
        acc[job.id] = job;
        return acc;
      }, {});

      setJobsMap(mapped);
    } else {
      setJobsMap({});
    }

    const appIds = nextApps.map((app) => app.id);
    void loadUnreadCounts(appIds);
    void loadLastMessages(appIds);

    if (userId) void loadUnlinkedMessages(userId);

    setIsLoading(false);
  }, [loadLastMessages, loadUnlinkedMessages, loadUnreadCounts, userId]);

  const reassignMessage = useCallback(
    async (messageId: string, targetApplicationId: string) => {
      setReassigningMessageId(messageId);
      const { error } = await supabase
        .from("application_messages")
        .update({ application_id: targetApplicationId })
        .eq("id", messageId);

      if (error) {
        toast({
          title: "Zuordnung fehlgeschlagen",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Nachricht zugeordnet" });
        setUnlinkedMessages((prev) => prev.filter((m) => m.id !== messageId));
        void loadApplications();
      }
      setReassigningMessageId(null);
    },
    [loadApplications, toast]
  );

  const loadMessages = useCallback(async (applicationId: string) => {
    setIsLoadingMessages(true);

    const { data, error } = await supabase
      .from("application_messages")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });

    if (!error) {
      const rows = data ?? [];
      setMessages(rows);

      const hasUnreadInbound = rows.some((row) => row.direction === "inbound" && !row.is_read);
      if (hasUnreadInbound) {
        await supabase
          .from("application_messages")
          .update({ is_read: true })
          .eq("application_id", applicationId)
          .eq("direction", "inbound")
          .eq("is_read", false);

        setUnreadCounts((prev) => {
          const next = { ...prev };
          delete next[applicationId];
          return next;
        });
      }
    } else {
      setMessages([]);
    }

    setIsLoadingMessages(false);
  }, []);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId]
  );

  const latestInboundMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].direction === "inbound") return messages[i];
    }
    return null;
  }, [messages]);

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const aUnread = unreadCounts[a.id] ?? 0;
      const bUnread = unreadCounts[b.id] ?? 0;
      if (aUnread > 0 && bUnread === 0) return -1;
      if (bUnread > 0 && aUnread === 0) return 1;

      const aTime = lastMessageMap[a.id]?.createdAt ?? a.updated_at ?? a.created_at;
      const bTime = lastMessageMap[b.id]?.createdAt ?? b.updated_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [applications, unreadCounts, lastMessageMap]);

  const totalUnread = useMemo(
    () => Object.values(unreadCounts).reduce((sum, count) => sum + count, 0),
    [unreadCounts]
  );

  const decoratedMessages = useMemo<DecoratedMessage[]>(() => {
    const rows: DecoratedMessage[] = [];
    let lastDayKey: string | null = null;

    for (const message of messages) {
      const dayKey = message.created_at ? new Date(message.created_at).toDateString() : null;
      if (dayKey && dayKey !== lastDayKey) {
        rows.push({
          kind: "separator",
          key: `separator-${dayKey}`,
          label: formatMessageDayLabel(message.created_at),
        });
        lastDayKey = dayKey;
      }
      rows.push({ kind: "message", key: message.id, message });
    }

    return rows;
  }, [messages]);

  const totalReplyAttachmentBytes = useMemo(
    () => replyAttachments.reduce((sum, item) => sum + item.sizeBytes, 0),
    [replyAttachments]
  );

  const selectApplication = (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    setReplyText("");
    setReplyAttachments([]);
    setExpandedQuotedIds([]);
    if (replyAttachmentInputRef.current) {
      replyAttachmentInputRef.current.value = "";
    }
    setMobileView("messages");
  };

  useEffect(() => {
    selectedApplicationIdRef.current = selectedApplicationId;
  }, [selectedApplicationId]);

  const toggleQuotedMessage = (messageId: string) => {
    setExpandedQuotedIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  };

  const handleReplyAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setReplyAttachments((prev) => {
      const currentTotal = prev.reduce((sum, item) => sum + item.sizeBytes, 0);
      let runningTotal = currentTotal;
      const next = [...prev];

      for (const file of files) {
        if (file.size > MAX_REPLY_ATTACHMENTS_BYTES) {
          toast({
            title: "Anhang zu groß",
            description: `${file.name} überschreitet 10 MB.`,
            variant: "destructive",
          });
          continue;
        }

        if (runningTotal + file.size > MAX_REPLY_ATTACHMENTS_BYTES) {
          toast({
            title: "Anhang-Limit erreicht",
            description: "Gesamtgröße darf 10 MB nicht überschreiten.",
            variant: "destructive",
          });
          break;
        }

        runningTotal += file.size;
        next.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
      }

      return next;
    });

    event.target.value = "";
  };

  const handleRemoveReplyAttachment = (attachmentId: string) => {
    setReplyAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  };

  const uploadReplyAttachments = useCallback(
    async (applicationId: string): Promise<UploadedReplyAttachment[]> => {
      if (!userId || replyAttachments.length === 0) return [];

      const uploaded: UploadedReplyAttachment[] = [];
      for (const attachment of replyAttachments) {
        const filePath = `${userId}/reply-attachments/${applicationId}/${Date.now()}-${sanitizeFileName(
          attachment.fileName
        )}`;

        const { error } = await supabase.storage
          .from("user-files")
          .upload(filePath, attachment.file, {
            upsert: false,
            contentType: attachment.mimeType,
          });

        if (error) {
          throw new Error(`Upload fehlgeschlagen (${attachment.fileName}): ${error.message}`);
        }

        uploaded.push({
          filePath,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        });
      }

      return uploaded;
    },
    [replyAttachments, userId]
  );

  const handleSendReply = useCallback(async () => {
    if (!selectedApplication || !replyText.trim()) return;

    const recipient = latestInboundMessage?.sender ?? selectedApplication.recipient_email;
    if (!recipient) {
      toast({
        title: "Empfänger fehlt",
        description: "Keine Empfängeradresse gefunden.",
        variant: "destructive",
      });
      return;
    }

    setIsReplying(true);

    let uploaded: UploadedReplyAttachment[] = [];

    try {
      uploaded = await uploadReplyAttachments(selectedApplication.id);

      const baseSubject = latestInboundMessage?.subject ?? selectedApplication.subject ?? "Ihre Nachricht";
      const subject = baseSubject.toLowerCase().startsWith("re:") ? baseSubject : `Re: ${baseSubject}`;

      const result = await replyApplicationEmail({
        applicationId: selectedApplication.id,
        recipient,
        subject,
        text: replyText,
        attachments: uploaded,
        inReplyToMessageId: latestInboundMessage?.message_id ?? undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Antwort konnte nicht gesendet werden.");
      }

      void logFunnelEvent(
        "funnel_reply_success",
        {
          application_id: selectedApplication.id,
          recipient_email: recipient,
          attachment_count: uploaded.length,
          attachment_total_bytes: uploaded.reduce((sum, item) => sum + item.sizeBytes, 0),
        },
        userId
      );

      toast({
        title: "Antwort gesendet",
        description: "Ihre Antwort wurde erfolgreich versendet.",
      });

      setReplyText("");
      setReplyAttachments([]);
      if (replyAttachmentInputRef.current) {
        replyAttachmentInputRef.current.value = "";
      }

      await loadMessages(selectedApplication.id);
      await loadApplications();
    } catch (error) {
      if (uploaded.length > 0) {
        await supabase.storage
          .from("user-files")
          .remove(uploaded.map((item) => item.filePath));
      }

      void logFunnelEvent(
        "funnel_reply_failed",
        {
          application_id: selectedApplication.id,
          recipient_email: recipient,
          attachment_count: replyAttachments.length,
          error: error instanceof Error ? error.message : "unknown_error",
        },
        userId
      );

      toast({
        title: "Antwort fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsReplying(false);
    }
  }, [
    latestInboundMessage?.message_id,
    latestInboundMessage?.sender,
    latestInboundMessage?.subject,
    loadApplications,
    loadMessages,
    replyAttachments.length,
    replyText,
    selectedApplication,
    toast,
    uploadReplyAttachments,
    userId,
  ]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthLoading(false);
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthLoading(false);
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    void loadApplications();
    const interval = setInterval(() => {
      void loadApplications();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadApplications, userId]);

  useEffect(() => {
    if (!selectedApplicationId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedApplicationId);
  }, [loadMessages, selectedApplicationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`inbox-applications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadApplications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadApplications, userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`inbox-messages-global-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "application_messages",
        },
        (payload) => {
          const changedRow = (payload.new ?? payload.old) as
            | Tables<"application_messages">
            | undefined;

          // Refresh unlinked messages when any message changes for this user
          if (changedRow?.user_id === userId) {
            void loadUnlinkedMessages(userId);
          }

          if (!changedRow?.application_id) return;

          const currentSelectedId = selectedApplicationIdRef.current;
          if (currentSelectedId && currentSelectedId === changedRow.application_id) {
            void loadMessages(currentSelectedId);
          }
          void loadApplications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadApplications, loadMessages, loadUnlinkedMessages, userId]);

  const listPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/50 px-4 py-3">
        <p className="text-sm font-semibold tracking-tight">Nachrichten</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {unlinkedMessages.length > 0 ? (
          <div className="border-b border-amber-200 bg-amber-50/60 px-3 py-2">
            <div className="mb-1.5 flex items-center gap-2">
              <MailQuestion className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">
                Nicht zugeordnet ({unlinkedMessages.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {unlinkedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {msg.sender || "Unbekannt"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {msg.subject || "(ohne Betreff)"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {messagePreview(msg.text_body)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatShortDate(msg.created_at)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <select
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                      defaultValue=""
                      disabled={reassigningMessageId === msg.id}
                      onChange={(e) => {
                        if (e.target.value) {
                          void reassignMessage(msg.id, e.target.value);
                        }
                      }}
                    >
                      <option value="" disabled>
                        {reassigningMessageId === msg.id ? "Wird zugeordnet..." : "Bewerbung zuordnen..."}
                      </option>
                      {applications.map((app) => {
                        const job = jobsMap[app.job_id];
                        return (
                          <option key={app.id} value={app.id}>
                            {job?.hospital_name || app.recipient_email} — {job?.title || app.subject || "Bewerbung"}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : sortedApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <Mail className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Noch keine Bewerbungen vorhanden.</p>
            <Button asChild size="sm" className="mt-4">
              <Link to="/jobs">
                <BriefcaseBusiness className="mr-2 h-4 w-4" />
                Zur Jobbörse
              </Link>
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {sortedApplications.map((application) => {
              const relatedJob = jobsMap[application.job_id];
              const unread = unreadCounts[application.id] ?? 0;
              const isSelected = selectedApplicationId === application.id;
              const last = lastMessageMap[application.id];
              const hospital = relatedJob?.hospital_name || application.recipient_email || "Unbekannt";
              const title = relatedJob?.title || application.subject || "Bewerbung";
              const displayTime =
                last?.createdAt ??
                application.submitted_at ??
                application.updated_at ??
                application.created_at;
              const fallbackPreview = application.message_text
                ? messagePreview(application.message_text) || "(ohne Text)"
                : "";

              return (
                <button
                  key={application.id}
                  type="button"
                  onClick={() => selectApplication(application.id)}
                  className={`mb-1.5 w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary/30 bg-primary/8"
                      : unread > 0
                        ? "border-primary/25 bg-primary/5 hover:bg-primary/10"
                      : "border-border/60 bg-card/70 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                        unread > 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {getInitials(relatedJob?.hospital_name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${unread > 0 ? "font-semibold" : "font-medium"}`}>
                          {hospital}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatShortDate(displayTime)}
                        </span>
                      </div>

                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{title}</p>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">
                          {last
                            ? `${last.direction === "outbound" ? "Sie: " : ""}${last.text || "(ohne Text)"}`
                            : fallbackPreview
                              ? `Sie: ${fallbackPreview}`
                              : "Keine Nachrichten"}
                        </p>
                        <div className="shrink-0">
                          {unread > 0 && last?.direction === "inbound" ? (
                            <span className="mr-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              Neue Antwort
                            </span>
                          ) : null}
                          {unread > 0 ? (
                            <span className="inline-flex h-5 min-w-[24px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              {unreadBadgeLabel(unread)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const messagesPanel = (
    <div className="flex h-full min-h-0 flex-col">
      {selectedApplication ? (
        <>
          <div className="border-b border-border/50 px-4 py-3">
            <div className="mb-2 flex items-center gap-2 lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setMobileView("list")} className="h-8 px-2">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Zurück
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {jobsMap[selectedApplication.job_id]?.hospital_name ||
                    selectedApplication.recipient_email ||
                    "Unbekannt"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {jobsMap[selectedApplication.job_id]?.title || selectedApplication.subject || "Bewerbung"}
                </p>
              </div>
              <Badge className={`border text-[10px] ${statusBadgeClass(selectedApplication.status)}`}>
                Bewerbung: {statusLabel(selectedApplication.status)}
              </Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                {selectedApplication.message_text?.trim() || selectedApplication.subject?.trim() ? (
                  <div className="flex w-full justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#007AFF] px-4 py-3 text-white shadow-sm dark:bg-[#0A84FF]">
                      {selectedApplication.subject ? (
                        <p className="mb-1 text-sm font-medium text-white">
                          {selectedApplication.subject}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-line text-sm leading-relaxed text-white/95">
                        {selectedApplication.message_text?.trim() || "(Kein Textinhalt)"}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/70">
                        <span>
                          {formatDateTime(
                            selectedApplication.submitted_at ??
                              selectedApplication.updated_at ??
                              selectedApplication.created_at
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          Gesendet
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Mail className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Noch keine Nachrichten.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {decoratedMessages.map((entry) => {
                  if (entry.kind === "separator") {
                    return (
                      <div key={entry.key} className="flex justify-center py-1">
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                          {entry.label}
                        </span>
                      </div>
                    );
                  }

                  const message = entry.message;
                  const isOutbound = message.direction === "outbound";
                  const messageParts = isOutbound
                    ? { visibleText: message.text_body || "", quotedText: "" }
                    : splitQuotedBody(message.text_body);
                  const hasQuoted = Boolean(messageParts.quotedText);
                  const isQuotedExpanded = expandedQuotedIds.includes(message.id);
                  const isUnreadInbound = !isOutbound && !message.is_read;

                  return (
                    <div key={entry.key} className={`flex w-full ${isOutbound ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          isOutbound
                            ? "rounded-br-md bg-[#007AFF] text-white shadow-sm dark:bg-[#0A84FF]"
                            : isUnreadInbound
                              ? "rounded-bl-md bg-[#E9E9EB] text-foreground shadow-sm ring-1 ring-primary/20 dark:bg-[#2C2C2E] dark:text-white"
                              : "rounded-bl-md bg-[#E9E9EB] text-foreground shadow-sm dark:bg-[#2C2C2E] dark:text-white"
                        }`}
                      >
                        {message.subject ? (
                          <p className={`mb-1 text-sm font-medium ${isOutbound ? "text-white" : "text-foreground dark:text-white"}`}>
                            {message.subject}
                          </p>
                        ) : null}

                        <p
                          className={`whitespace-pre-line text-sm leading-relaxed ${
                            isOutbound ? "text-white/95" : "text-foreground dark:text-white"
                          }`}
                        >
                          {messageParts.visibleText || "(Kein Textinhalt)"}
                        </p>

                        {!isOutbound && hasQuoted ? (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => toggleQuotedMessage(message.id)}
                              className="inline-flex h-6 items-center rounded px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                              aria-expanded={isQuotedExpanded}
                            >
                              {isQuotedExpanded ? "Zitierten Verlauf ausblenden" : "..."}
                            </button>
                            {isQuotedExpanded ? (
                              <div className="mt-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
                                <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                                  {messageParts.quotedText}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {!isOutbound && message.match_confidence === "medium" ? (
                          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Automatisch zugeordnet — ggf. prüfen</span>
                          </div>
                        ) : null}

                        <div
                          className={`mt-2 flex items-center justify-between gap-2 text-[11px] ${
                            isOutbound ? "text-white/70" : "text-muted-foreground"
                          }`}
                        >
                          <span>{formatDateTime(message.created_at)}</span>
                          <span className="inline-flex items-center gap-1">
                            {isOutbound ? (
                              <>
                                <Send className="h-3 w-3" />
                                Gesendet
                              </>
                            ) : message.is_read ? (
                              <>
                                <MailCheck className="h-3 w-3" />
                                Gelesen
                              </>
                            ) : (
                              <>
                                <MailWarning className="h-3 w-3" />
                                Neu
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-border/50 bg-background p-3">
            <input
              ref={replyAttachmentInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleReplyAttachmentSelect}
            />

            {replyAttachments.length > 0 ? (
              <div className="mb-2 space-y-1.5 rounded-xl border border-border/70 bg-card/60 p-2">
                {replyAttachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="inline-flex min-w-0 items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{attachment.fileName}</span>
                      <span className="text-muted-foreground">({humanFileSize(attachment.sizeBytes)})</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleRemoveReplyAttachment(attachment.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  Gesamt: {humanFileSize(totalReplyAttachmentBytes)} / 10 MB
                </p>
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 px-2"
                onClick={() => replyAttachmentInputRef.current?.click()}
                disabled={isReplying}
              >
                <Upload className="h-4 w-4" />
              </Button>

              <Textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                rows={1}
                placeholder="Nachricht schreiben…"
                className="min-h-[42px] max-h-28 flex-1 resize-none"
              />

              <Button
                size="sm"
                className="h-10 px-3"
                onClick={() => void handleSendReply()}
                disabled={isReplying || !replyText.trim()}
              >
                {isReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-4 py-16 text-center">
          <Mail className="mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Wählen Sie eine Konversation aus.</p>
        </div>
      )}
    </div>
  );

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <nav className="glass-nav z-50 shrink-0">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <BrandLogo />
          </Link>

          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight">
              Inbox
              {totalUnread > 0 ? (
                <Badge className="ml-2 bg-primary px-1.5 py-0 text-[10px] text-primary-foreground">
                  {totalUnread}
                </Badge>
              ) : null}
            </h1>
            <Button asChild variant="ghost" size="sm" className="h-9 px-3">
              <Link to="/jobs">Jobs</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex-1 min-h-0">
        <div className="hidden h-full border-t border-border/50 lg:grid lg:grid-cols-[330px_minmax(0,1fr)]">
          <div className="overflow-hidden border-r border-border/50 bg-card/40">{listPanel}</div>
          <div className="overflow-hidden">{messagesPanel}</div>
        </div>

        <div className="h-full lg:hidden">{mobileView === "list" ? listPanel : messagesPanel}</div>
      </div>
    </div>
  );
};

export default InboxPage;
