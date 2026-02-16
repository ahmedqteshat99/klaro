import { useState } from "react";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { buildJobPath } from "@/lib/slug";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Share2,
  Sparkles,
} from "lucide-react";

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

interface JobDetailHeaderProps {
  job: Tables<"jobs">;
  baseUrl: string;
  isAuthenticated: boolean;
  onPrepareClick: () => void;
  isPreparing: boolean;
  applyNextUrl: string;
}

const JobDetailHeader = ({
  job,
  baseUrl,
  isAuthenticated,
  onPrepareClick,
  isPreparing,
  applyNextUrl,
}: JobDetailHeaderProps) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const isNew = job.published_at
    ? (() => {
        const published = new Date(job.published_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return published >= sevenDaysAgo;
      })()
    : false;

  const expiringSoon = job.expires_at
    ? (() => {
        const expires = new Date(job.expires_at);
        const fourteenDaysFromNow = new Date();
        fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
        return expires <= fourteenDaysFromNow && expires > new Date();
      })()
    : false;

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

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/jobs" className="hover:text-foreground transition-colors">
          Jobs
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {job.hospital_name && (
          <>
            <span className="truncate max-w-[140px]">{job.hospital_name}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {job.title}
        </span>
      </nav>

      {/* Header Card */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          {/* Badges */}
          {(isNew || expiringSoon) && (
            <div className="flex items-center gap-1.5">
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
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
            {job.title}
          </h1>

          {/* Hospital name — elevated, brand color */}
          {job.hospital_name && (
            <p className="text-base font-semibold text-primary">
              {job.hospital_name}
            </p>
          )}

          {/* Meta info */}
          <div className="space-y-1.5">
            {(job.location || job.department) && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{job.location}</span>
                {job.location && job.department && (
                  <span className="text-border">·</span>
                )}
                {job.department && (
                  <>
                    {!job.location && <Building2 className="h-4 w-4 shrink-0" />}
                    <span>{job.department}</span>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Veröffentlicht: {formatDate(job.published_at)}</span>
              {job.expires_at && (
                <>
                  <span className="text-border">·</span>
                  <span>Frist: {formatDate(job.expires_at)}</span>
                </>
              )}
            </div>
          </div>

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.tags.map((tag) => (
                <Badge key={`${job.id}-${tag}`} variant="secondary" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
            {isAuthenticated ? (
              <Button onClick={onPrepareClick} disabled={isPreparing}>
                <Sparkles className="mr-2 h-4 w-4" />
                Jetzt bewerben
              </Button>
            ) : (
              <Button asChild>
                <Link to={`/auth?next=${encodeURIComponent(applyNextUrl)}`}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Registrieren & bewerben
                </Link>
              </Button>
            )}

            {(job.apply_url || job.source_url) && (
              <Button asChild variant="outline" size="sm">
                <a href={job.apply_url || job.source_url!} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Originalanzeige
                </a>
              </Button>
            )}

            {/* Share */}
            <div className="flex items-center gap-1 ml-auto">
              <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-8 px-2">
                {linkCopied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="ml-1.5 text-xs hidden sm:inline">
                  {linkCopied ? "Kopiert" : "Link"}
                </span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShareWhatsApp} className="h-8 px-2">
                <Share2 className="h-4 w-4" />
                <span className="ml-1.5 text-xs hidden sm:inline">Teilen</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobDetailHeader;
