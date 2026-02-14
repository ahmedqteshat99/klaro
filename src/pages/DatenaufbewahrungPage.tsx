import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Trash2, Shield, AlertCircle } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import BrandLogo from "@/components/BrandLogo";

const DatenaufbewahrungPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo />
          </Link>
          <Button asChild variant="ghost">
            <Link to="/datenschutz">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zur Datenschutzerklärung
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Datenaufbewahrungsrichtlinie
        </h1>

        <div className="prose prose-lg max-w-none text-foreground space-y-8">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Überblick
            </h2>
            <p className="text-muted-foreground mb-4">
              Diese Richtlinie erklärt, wie lange wir Ihre personenbezogenen Daten aufbewahren
              und unter welchen Umständen diese automatisch oder auf Anfrage gelöscht werden.
            </p>
            <p className="text-muted-foreground">
              Wir halten uns an die DSGVO-Grundsätze der Speicherbegrenzung (Art. 5 Abs. 1 lit. e)
              und Datenminimierung (Art. 5 Abs. 1 lit. c).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Aktive Konten</h2>
            <div className="rounded-lg border p-4 space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-1" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2">Aufbewahrungsdauer: Unbegrenzt (solange Ihr Konto aktiv ist)</h3>
                  <p className="text-sm text-muted-foreground">
                    Ihre Profildaten, Berufserfahrung, generierte Dokumente und Bewerbungen
                    bleiben gespeichert, solange Ihr Konto existiert und Sie unsere Dienste nutzen.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              <strong>Rechtsgrundlage:</strong> Vertragserfüllung (DSGVO Art. 6 Abs. 1 lit. b)
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Inaktive Konten</h2>
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2 text-amber-900 dark:text-amber-200">
                    Automatische Löschung nach 24 Monaten Inaktivität
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Wenn Sie sich 24 Monate lang nicht einloggen oder die Plattform nicht nutzen,
                    gelten Sie als inaktiv.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="font-semibold mb-3">Ablauf der automatischen Löschung:</h3>
            <ol className="list-decimal pl-6 space-y-3 text-muted-foreground">
              <li>
                <strong>Nach 18 Monaten Inaktivität:</strong> Sie erhalten eine E-Mail-Warnung,
                dass Ihr Konto in 6 Monaten zur Löschung vorgemerkt wird.
              </li>
              <li>
                <strong>Nach 22 Monaten Inaktivität:</strong> Sie erhalten eine zweite und letzte
                Warnung per E-Mail, dass Ihr Konto in 2 Monaten gelöscht wird.
              </li>
              <li>
                <strong>Nach 24 Monaten Inaktivität:</strong> Ihr Konto und alle zugehörigen Daten
                werden automatisch und unwiderruflich gelöscht.
              </li>
            </ol>

            <p className="text-sm text-muted-foreground mt-4">
              <strong>Hinweis:</strong> Sie können die automatische Löschung jederzeit verhindern,
              indem Sie sich einfach einloggen oder die Plattform nutzen.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Gelöschte Konten</h2>
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4 mb-4">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-red-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2 text-red-900 dark:text-red-200">
                    Sofortige und vollständige Löschung
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-300">
                    Wenn Sie Ihr Konto löschen (manuell oder automatisch), werden ALLE Ihre
                    personenbezogenen Daten sofort und unwiderruflich aus unseren Systemen entfernt.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="font-semibold mb-3">Was wird gelöscht:</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Ihr Profil (Name, Kontaktdaten, Berufsinformationen)</li>
              <li>Alle Berufserfahrungen, Ausbildungen, Zertifikate</li>
              <li>Alle generierten Dokumente (CVs und Anschreiben)</li>
              <li>Ihre Bewerbungen und Kommunikationsverläufe</li>
              <li>E-Mail-Präferenzen und Aliase</li>
              <li>Authentifizierungsdaten und Sitzungen</li>
            </ul>

            <p className="text-sm text-muted-foreground">
              <strong>Ausnahmen:</strong> In seltenen Fällen können aggregierte, anonymisierte
              Statistiken für analytische Zwecke aufbewahrt werden (ohne Personenbezug).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Spezifische Datentypen</h2>

            <h3 className="font-semibold mb-3">KI-generierte Texte (Anthropic Claude)</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>
                <strong>Bei Anthropic:</strong> Maximal 30 Tage zu Sicherheitszwecken,
                dann automatische Löschung
              </li>
              <li>
                <strong>Bei uns:</strong> Unbegrenzt, solange Ihr Konto aktiv ist
              </li>
            </ul>

            <h3 className="font-semibold mb-3">E-Mail-Logs (Mailgun)</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>
                <strong>Versandprotokolle:</strong> 30 Tage bei Mailgun, dann automatische Löschung
              </li>
              <li>
                <strong>Inhalt von E-Mails:</strong> Wird nicht dauerhaft gespeichert
              </li>
            </ul>

            <h3 className="font-semibold mb-3">Admin Audit-Logs</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>
                <strong>Aufbewahrungsdauer:</strong> 2 Jahre (DSGVO-Anforderung für Rechenschaftspflicht)
              </li>
              <li>
                <strong>Automatische Löschung:</strong> Nach 2 Jahren
              </li>
              <li>
                <strong>Zweck:</strong> Nachweis der DSGVO-Compliance und Überwachung von Datenzugriffen
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Ihr Recht auf vorzeitige Löschung</h2>
            <p className="text-muted-foreground mb-4">
              Sie haben jederzeit das Recht, die Löschung Ihrer personenbezogenen Daten zu
              verlangen (DSGVO Art. 17 - Recht auf Vergessenwerden).
            </p>

            <h3 className="font-semibold mb-3">So beantragen Sie die Löschung:</h3>
            <ol className="list-decimal pl-6 space-y-3 text-muted-foreground mb-4">
              <li>
                <strong>Selbst durchführen:</strong> Gehen Sie in Ihrem Dashboard zu
                "Profil & Einstellungen" und wählen Sie "Konto löschen"
              </li>
              <li>
                <strong>Per E-Mail anfragen:</strong> Senden Sie eine E-Mail an{" "}
                <a href="mailto:ahmedqteshat99@gmail.com" className="text-primary hover:underline">
                  ahmedqteshat99@gmail.com
                </a>{" "}
                mit dem Betreff "Löschung meiner Daten"
              </li>
            </ol>

            <p className="text-sm text-muted-foreground">
              <strong>Bearbeitungszeit:</strong> Wir bearbeiten Löschanfragen innerhalb von
              30 Tagen (gesetzliche Frist gemäß DSGVO Art. 17 Abs. 1).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Ausnahmen von der Löschung</h2>
            <p className="text-muted-foreground mb-4">
              In folgenden Fällen sind wir rechtlich verpflichtet, bestimmte Daten länger
              aufzubewahren oder können Löschanfragen ablehnen:
            </p>

            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Gesetzliche Aufbewahrungspflichten:</strong> z.B. steuerrechtliche Vorgaben
              </li>
              <li>
                <strong>Rechtliche Ansprüche:</strong> Wenn laufende Rechtsstreitigkeiten bestehen
              </li>
              <li>
                <strong>Öffentliches Interesse:</strong> In seltenen Fällen im Rahmen von
                Gesundheitsschutz oder öffentlichem Interesse
              </li>
            </ul>

            <p className="text-sm text-muted-foreground mt-4">
              Sollte eine solche Ausnahme auf Sie zutreffen, werden wir Sie transparent darüber
              informieren und die Rechtsgrundlage erläutern.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Kontakt & Fragen</h2>
            <p className="text-muted-foreground mb-4">
              Bei Fragen zur Datenaufbewahrung oder Löschung kontaktieren Sie uns bitte:
            </p>
            <p className="text-muted-foreground">
              <strong>E-Mail:</strong>{" "}
              <a href="mailto:ahmedqteshat99@gmail.com" className="text-primary hover:underline">
                ahmedqteshat99@gmail.com
              </a>
            </p>
          </section>

          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Letzte Aktualisierung:</strong> Februar 2026
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Diese Richtlinie ist Teil unserer{" "}
              <Link to="/datenschutz" className="text-primary hover:underline">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default DatenaufbewahrungPage;
