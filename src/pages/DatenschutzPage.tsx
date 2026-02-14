import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import BrandLogo from "@/components/BrandLogo";

const DatenschutzPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo />
          </Link>
          <Button asChild variant="ghost">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Datenschutzerklärung</h1>

        <div className="prose prose-lg max-w-none text-foreground">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Verantwortlicher</h2>
            <p className="text-muted-foreground mb-4">
              Verantwortlich für die Datenverarbeitung ist:
            </p>
            <p className="text-muted-foreground">
              Ahmed Quteishat<br />
              Arad, Rumänien<br />
              E-Mail: ahmedqteshat99@gmail.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Welche Daten wir verarbeiten</h2>
            <p className="text-muted-foreground mb-4">
              Bei Nutzung der Plattform können folgende personenbezogene Daten verarbeitet werden:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>E-Mail-Adresse und Kontodaten</li>
              <li>DoctorProfile-Felder (z. B. Name, Ausbildung, Berufserfahrung, Fähigkeiten)</li>
              <li>Generierte Dokumente (CV- und Anschreiben-Versionen)</li>
              <li>Signaturbild (optional) und ggf. Profilfoto</li>
            </ul>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 mt-4">
              <h3 className="text-md font-semibold mb-2 text-blue-900 dark:text-blue-200">
                Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO)
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                Ihre medizinischen Berufsdaten (Fachrichtung, Facharzt-Status, Ausbildungsinhalte,
                medizinische Spezialisierungen) gelten als besondere Kategorie personenbezogener Daten
                im Sinne von Art. 9 DSGVO.
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Rechtsgrundlage:</strong> Diese Daten werden nur mit Ihrer <strong>ausdrücklichen Einwilligung</strong> verarbeitet
                (Art. 9 Abs. 2 lit. a DSGVO). Sie erteilen diese Einwilligung bei der Registrierung und können
                sie jederzeit widerrufen.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Zweck der Verarbeitung</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Erstellung von Lebenslauf und Anschreiben</li>
              <li>Speicherung Ihrer Dokument-Versionen</li>
              <li>Bereitstellung Ihres Nutzerkontos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. KI-Nutzung (Anthropic Claude)</h2>
            <p className="text-muted-foreground mb-4">
              Für die Textgenerierung von Lebensläufen und Anschreiben nutzen wir Anthropic Claude
              (ein KI-Sprachmodell). Dabei werden Ihre Profildaten (Name, Ausbildung, Berufserfahrung,
              Qualifikationen) an die Anthropic API übermittelt.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>Rechtsgrundlage:</strong> Ihre Einwilligung durch Nutzung der Generierungsfunktion
              (DSGVO Art. 6 Abs. 1 lit. a). Anthropic verarbeitet die Daten in unserem Auftrag gemäß
              deren Auftragsverarbeitungsvertrag.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>Datenspeicherung:</strong> Anthropic speichert übermittelte Daten für maximal
              30 Tage zu Sicherheitszwecken. Ihre Daten werden nicht für das Training von KI-Modellen
              verwendet.
            </p>
            <p className="text-muted-foreground">
              <strong>Wichtig:</strong> Die KI erzeugt Texte ausschließlich auf Basis Ihrer Angaben.
              Bitte prüfen Sie alle generierten Inhalte sorgfältig vor der Verwendung, da Sie für
              die Richtigkeit Ihrer Bewerbungsunterlagen verantwortlich sind.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Hosting & Auftragsverarbeiter</h2>
            <p className="text-muted-foreground mb-4">
              Wir nutzen spezialisierte Dienstleister (Auftragsverarbeiter nach DSGVO Art. 28) für den
              sicheren Betrieb unserer Plattform. Diese Anbieter verarbeiten Daten ausschließlich in
              unserem Auftrag und gemäß unserer Weisung.
            </p>

            <h3 className="text-lg font-semibold mb-3 mt-6">Supabase (Datenbank & Authentifizierung)</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Zweck:</strong> Hosting der Datenbank, Benutzerverwaltung, Speicherung Ihrer Profil- und Dokumentdaten</li>
              <li><strong>Standort:</strong> EU-Region (DSGVO-konform)</li>
              <li><strong>Rechtsgrundlage:</strong> Auftragsverarbeitung (Art. 28 DSGVO)</li>
              <li><strong>DPA:</strong> <a href="https://supabase.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase Data Processing Agreement</a></li>
            </ul>

            <h4 className="text-md font-semibold mb-2 mt-4">Sub-Auftragsverarbeiter:</h4>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>AWS (Amazon Web Services):</strong> EU-Region Frankfurt – Hosting-Infrastruktur</li>
              <li><strong>Vollständige Liste:</strong> <a href="https://supabase.com/docs/company/subprocessors" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase Sub-Processors</a></li>
            </ul>

            <h3 className="text-lg font-semibold mb-3 mt-6">Anthropic (KI-Textgenerierung)</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Zweck:</strong> Generierung von Lebensläufen und Anschreiben mittels KI</li>
              <li><strong>Übermittelte Daten:</strong> Ihre Profildaten (Name, Ausbildung, Berufserfahrung, Qualifikationen)</li>
              <li><strong>Standort:</strong> USA (Drittlandübermittlung mit Schutzmaßnahmen)</li>
              <li><strong>Rechtsgrundlage:</strong> Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) + Auftragsverarbeitung (Art. 28 DSGVO)</li>
              <li><strong>Speicherdauer:</strong> Maximal 30 Tage zu Sicherheitszwecken</li>
              <li><strong>Kein Training:</strong> Ihre Daten werden nicht für das Training von KI-Modellen verwendet</li>
              <li><strong>DPA:</strong> <a href="https://www.anthropic.com/legal/commercial-terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Anthropic Commercial Terms & DPA</a></li>
            </ul>

            <h4 className="text-md font-semibold mb-2 mt-4">Drittlandübermittlung (USA):</h4>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>SCCs:</strong> EU-Standardvertragsklauseln (Module 2: Controller-to-Processor) gemäß Durchführungsbeschluss (EU) 2021/914</li>
              <li><strong>Schrems II Maßnahmen:</strong> Verschlüsselung in Transit (TLS 1.3) und at Rest (AES-256); keine Datenweitergabe an US-Behörden ohne EU-Rechtsschutz</li>
              <li><strong>Details:</strong> <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Anthropic Privacy Policy - International Transfers</a></li>
            </ul>

            <h3 className="text-lg font-semibold mb-3 mt-6">Mailgun (E-Mail-Versand)</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Zweck:</strong> Versand von Benachrichtigungs-E-Mails (nur mit Ihrer Einwilligung)</li>
              <li><strong>Übermittelte Daten:</strong> E-Mail-Adresse, Vorname</li>
              <li><strong>Standort:</strong> EU-Region</li>
              <li><strong>Rechtsgrundlage:</strong> Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) + Auftragsverarbeitung (Art. 28 DSGVO)</li>
              <li><strong>DPA:</strong> <a href="https://www.mailgun.com/legal/dpa/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mailgun Data Processing Agreement</a></li>
            </ul>

            <h3 className="text-lg font-semibold mb-3 mt-6">Firecrawl (Web-Scraping für Stellenangebote)</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Zweck:</strong> Extraktion von Stellenangeboten von öffentlich zugänglichen Krankenhaus-Websites zur Bereitstellung aktueller Jobangebote</li>
              <li><strong>Übermittelte Daten:</strong> Nur URLs von öffentlichen Stellenanzeigen (keine personenbezogenen Nutzerdaten)</li>
              <li><strong>Standort:</strong> USA</li>
              <li><strong>Rechtsgrundlage:</strong> Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) zur Bereitstellung aktueller Stellenangebote</li>
              <li><strong>Datenschutz:</strong> <a href="https://firecrawl.dev/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Firecrawl Privacy Policy</a></li>
            </ul>

            <p className="text-muted-foreground mt-4 text-sm">
              Alle Auftragsverarbeiter wurden sorgfältig ausgewählt und sind vertraglich verpflichtet,
              Ihre Daten gemäß DSGVO zu schützen. Bei Fragen zu unseren Datenverarbeitungsvereinbarungen
              kontaktieren Sie uns bitte unter ahmedqteshat99@gmail.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Nutzungsanalyse und Verbesserung</h2>
            <p className="text-muted-foreground mb-4">
              Zur Verbesserung unserer Plattform erfassen wir anonymisierte Nutzungsdaten
              (z. B. welche Funktionen genutzt werden). Diese Daten dienen ausschließlich
              der technischen Optimierung und werden nicht für Werbung verwendet.
            </p>
            <p className="text-muted-foreground">
              Wir speichern keine Werbe-Cookies oder Tracking-Pixel von Drittanbietern.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. E-Mail-Benachrichtigungen</h2>
            <p className="text-muted-foreground mb-4">
              Mit Ihrer Einwilligung können wir Ihnen E-Mail-Benachrichtigungen senden:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Erinnerungen zur Vervollständigung Ihres Profils</li>
              <li>Benachrichtigungen über neue passende Stellenangebote</li>
              <li>Tipps zur Nutzung der Plattform</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Sie können diese Benachrichtigungen jederzeit in Ihren Kontoeinstellungen
              deaktivieren oder über den Abmelde-Link in jeder E-Mail abbestellen.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Cookies und lokale Speicherung</h2>
            <p className="text-muted-foreground mb-4">
              Wir verwenden folgende Technologien:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Technisch notwendig:</strong> Anmeldung und Sitzungsverwaltung (localStorage),
                Onboarding-Status</li>
              <li><strong>Optional (nur mit Ihrer Zustimmung):</strong> Speicherung von Marketing-Quellen
                (UTM-Parameter, Werbe-Klick-IDs) zur Verbesserung unserer Werbemaßnahmen</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Sie haben über unser Cookie-Banner volle Kontrolle über optionale Cookies und können
              Ihre Einstellungen jederzeit ändern. Technisch notwendige Cookies sind für die
              Grundfunktionen der Plattform erforderlich und können nicht deaktiviert werden.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Speicherdauer</h2>
            <p className="text-muted-foreground mb-4">
              Ihre Daten bleiben gespeichert, solange Ihr Konto besteht. Sie können Ihr Konto jederzeit
              löschen; dabei werden alle personenbezogenen Daten entfernt.
            </p>
            <p className="text-muted-foreground">
              Detaillierte Informationen zur Datenaufbewahrung, automatischen Löschung inaktiver Konten
              und Ihren Löschrechten finden Sie in unserer{" "}
              <Link to="/datenaufbewahrung" className="text-primary hover:underline">
                Datenaufbewahrungsrichtlinie
              </Link>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Konto löschen</h2>
            <p className="text-muted-foreground">
              Die Löschung ist jederzeit möglich im Dashboard unter{" "}
              <Link to="/dashboard" className="text-primary hover:underline">
                Account & Daten löschen
              </Link>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Ihre Rechte</h2>
            <p className="text-muted-foreground mb-4">
              Sie haben die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit
              und Widerspruch gemäß DSGVO.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. Datensicherheit</h2>
            <p className="text-muted-foreground">
              Daten werden verschlüsselt übertragen (HTTPS). Es werden angemessene technische und
              organisatorische Maßnahmen eingesetzt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">13. Änderungen</h2>
            <p className="text-muted-foreground">
              Diese Datenschutzerklärung kann angepasst werden. Die aktuelle Version ist immer hier
              verfügbar.
            </p>
          </section>

          <p className="text-muted-foreground text-sm mt-8">
            Stand: Februar 2026
          </p>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default DatenschutzPage;
