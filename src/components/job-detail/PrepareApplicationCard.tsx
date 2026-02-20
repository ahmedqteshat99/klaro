import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

interface PrepareApplicationCardProps {
  onPrepare: () => void;
  isPreparing: boolean;
  isDisabled: boolean;
  hasContactEmail: boolean;
}

const PrepareApplicationCard = ({
  onPrepare,
  isPreparing,
  isDisabled,
  hasContactEmail,
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

      {!hasContactEmail && !isPreparing && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Keine Kontakt-E-Mail hinterlegt. Sie können die Bewerbung als PDF herunterladen, aber nicht direkt versenden.
        </p>
      )}
    </CardContent>
  </Card>
);

export default PrepareApplicationCard;
