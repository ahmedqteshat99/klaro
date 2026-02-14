import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface AiConsentModalProps {
  open: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export default function AiConsentModal({ open, onConsent, onDecline }: AiConsentModalProps) {
  const [hasReadAndUnderstood, setHasReadAndUnderstood] = useState(false);

  const handleConsent = () => {
    if (!hasReadAndUnderstood) return;
    onConsent();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            KI-gestützte Textgenerierung
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-4 pt-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <p className="font-medium text-foreground">
                Wir nutzen Anthropic Claude (KI) zur Generierung Ihrer Bewerbungsunterlagen.
              </p>
              <p className="text-sm">
                Bevor wir beginnen, möchten wir transparent darüber informieren, welche Daten
                verarbeitet werden:
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">An Anthropic übermittelte Daten:</h4>
              <ul className="list-disc pl-6 text-sm space-y-1">
                <li>Ihr Name und Ihre Kontaktdaten</li>
                <li>Ausbildung und beruflicher Werdegang</li>
                <li>Berufserfahrung, Praktika und Fähigkeiten</li>
                <li>Zertifikate und Publikationen</li>
                <li>Stellenbeschreibung (bei Anschreiben-Generierung)</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Datenschutz-Garantien:</h4>
              <ul className="list-disc pl-6 text-sm space-y-1">
                <li>
                  <strong>Speicherung:</strong> Ihre Daten werden von Anthropic maximal 30 Tage
                  zu Sicherheitszwecken gespeichert
                </li>
                <li>
                  <strong>Kein Training:</strong> Ihre persönlichen Daten werden NICHT für das
                  Training von KI-Modellen verwendet
                </li>
                <li>
                  <strong>Verschlüsselung:</strong> Datenübertragung erfolgt verschlüsselt (HTTPS)
                </li>
                <li>
                  <strong>Rechtsgrundlage:</strong> DSGVO Art. 6 Abs. 1 lit. a (Ihre Einwilligung)
                  + Art. 28 (Auftragsverarbeitung)
                </li>
              </ul>
            </div>

            <div className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                ⚠️ Wichtiger Hinweis zur KI-Haftung
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-200">
                Die KI generiert Texte auf Basis Ihrer Angaben, kann aber <strong>Fehler, Ungenauigkeiten
                oder unangemessene Formulierungen</strong> enthalten. Sie sind <strong>selbst verantwortlich</strong> für
                die Richtigkeit, Vollständigkeit und Angemessenheit aller Bewerbungsunterlagen, die Sie
                an Arbeitgeber senden.
              </p>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                <strong>Sie MÜSSEN alle KI-generierten Inhalte vor der Verwendung sorgfältig prüfen und ggf. anpassen.</strong>
              </p>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="ai-consent-checkbox"
                checked={hasReadAndUnderstood}
                onCheckedChange={(checked) => setHasReadAndUnderstood(checked === true)}
              />
              <Label
                htmlFor="ai-consent-checkbox"
                className="text-sm font-normal cursor-pointer leading-relaxed"
              >
                Ich habe die Informationen gelesen und willige ein, dass meine Profildaten
                zur KI-gestützten Textgenerierung an Anthropic übermittelt werden. Ich kann
                diese Einwilligung jederzeit widerrufen.
              </Label>
            </div>

            <p className="text-xs text-muted-foreground">
              Weitere Details finden Sie in unserer{" "}
              <Link
                to="/datenschutz"
                target="_blank"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Datenschutzerklärung
                <ExternalLink className="h-3 w-3" />
              </Link>
              .
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onDecline}
            className="w-full sm:w-auto"
          >
            Ablehnen
          </Button>
          <Button
            onClick={handleConsent}
            disabled={!hasReadAndUnderstood}
            className="w-full sm:w-auto"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Zustimmen und fortfahren
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
