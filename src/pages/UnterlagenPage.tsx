import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { touchLastSeen } from "@/lib/app-events";
import BrandLogo from "@/components/BrandLogo";
import UserDocumentsVault from "@/components/profile/UserDocumentsVault";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Check, X } from "lucide-react";

const REQUIRED_DOC_TYPES = [
  { key: "approbation", label: "Approbation" },
  { key: "language_certificate", label: "Sprachzertifikat" },
  { key: "zeugnis", label: "Zeugnis" },
] as const;

const UnterlagenPage = () => {
  const navigate = useNavigate();

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [docTypeSet, setDocTypeSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthLoading(false);

      if (!session) {
        setUserId(null);
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthLoading(false);

      if (!session) {
        setUserId(null);
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadDocTypes = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("user_documents")
      .select("doc_type")
      .eq("user_id", uid);

    setDocTypeSet(new Set((data ?? []).map((item) => item.doc_type)));
  }, []);

  useEffect(() => {
    if (!userId) return;
    void loadDocTypes(userId);
    void touchLastSeen(userId);
  }, [loadDocTypes, userId]);

  const checklist = useMemo(
    () =>
      REQUIRED_DOC_TYPES.map((item) => ({
        label: item.label,
        done: docTypeSet.has(item.key),
      })),
    [docTypeSet]
  );

  const handleDocumentsChanged = useCallback((documents: { doc_type: string }[]) => {
    const next = new Set(documents.map((doc) => doc.doc_type));
    setDocTypeSet((prev) => {
      if (prev.size === next.size && [...next].every((value) => prev.has(value))) {
        return prev;
      }
      return next;
    });
  }, []);

  if (isAuthLoading) {
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

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
              <Link to="/profil?focus=cv-profile">Profile</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 pt-20 sm:pt-24 pb-10 space-y-5">
        <Card className="apple-surface-strong border-border/60">
          <CardContent className="p-5 sm:p-6">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Unterlagen</p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Bewerbungsunterlagen</h1>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkliste</CardTitle>
            <CardDescription>Empfohlene Pflichtunterlagen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md border p-2.5">
                <span className="text-sm">{item.label}</span>
                {item.done ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-medium">
                    <Check className="h-4 w-4" /> Hochgeladen
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-medium">
                    <X className="h-4 w-4" /> Fehlt
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {userId ? (
          <UserDocumentsVault
            userId={userId}
            onDocumentsChanged={handleDocumentsChanged}
          />
        ) : null}
      </div>
    </div>
  );
};

export default UnterlagenPage;
