import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

const PREPARE_LOADING_STEPS = [
  "Lebenslauf wird zusammengestellt...",
  "Anschreiben wird generiert...",
  "Dokumente werden finalisiert...",
  "E-Mail wird vorbereitet...",
] as const;

interface PrepareApplicationCardProps {
  onPrepare: () => void;
  isPreparing: boolean;
  isDisabled: boolean;
  hasContactEmail: boolean;
  prepareStepIndex: number;
  prepareProgress: number;
}

const PrepareApplicationCard = ({
  onPrepare,
  isPreparing,
  isDisabled,
  hasContactEmail,
  prepareStepIndex,
  prepareProgress,
}: PrepareApplicationCardProps) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        Bewerbung vorbereiten
      </CardTitle>
      <CardDescription className="text-xs">
        CV und Anschreiben werden automatisch generiert. Sie prüfen alles vor dem Versand.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <Button
        onClick={onPrepare}
        disabled={isPreparing || isDisabled}
        className="w-full"
      >
        {isPreparing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Wird vorbereitet...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Bewerbung vorbereiten
          </>
        )}
      </Button>

      {isPreparing && (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-primary leading-tight">
              {PREPARE_LOADING_STEPS[prepareStepIndex % PREPARE_LOADING_STEPS.length]}
            </p>
            <span className="text-xs font-semibold text-primary tabular-nums">
              {Math.round(prepareProgress)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-primary/20">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${prepareProgress}%` }}
            />
          </div>
        </div>
      )}

      {!hasContactEmail && !isPreparing && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Keine Kontakt-E-Mail hinterlegt. Sie können die Bewerbung als PDF herunterladen, aber nicht direkt versenden.
        </p>
      )}
    </CardContent>
  </Card>
);

export default PrepareApplicationCard;
