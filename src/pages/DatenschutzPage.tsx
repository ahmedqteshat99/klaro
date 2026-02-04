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
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>E-Mail-Adresse und Kontodaten</li>
              <li>DoctorProfile-Felder (z. B. Name, Ausbildung, Berufserfahrung, Fähigkeiten)</li>
              <li>Generierte Dokumente (CV- und Anschreiben-Versionen)</li>
              <li>Signaturbild (optional) und ggf. Profilfoto</li>
            </ul>
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
            <h2 className="text-xl font-semibold mb-4">4. KI-Nutzung</h2>
            <p className="text-muted-foreground">
              Für die Textgenerierung wird Anthropic Claude genutzt. Die KI erzeugt Texte ausschließlich
              auf Basis Ihrer Angaben und soll keine Fakten erfinden. Bitte prüfen Sie die Ergebnisse
              vor der Verwendung.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Hosting & Auftragsverarbeitung</h2>
            <p className="text-muted-foreground">
              Hosting erfolgt in der EU (Supabase, EU-Region). Weitere Anbieter werden hier genannt,
              falls sie ergänzt werden.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Keine Werbung, kein Tracking</h2>
            <p className="text-muted-foreground">
              Es gibt keine Werbung, keine Analytics/Tracking-Pixel und keine Marketing-E-Mails.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Cookies</h2>
            <p className="text-muted-foreground">
              Es werden nur technisch notwendige Cookies bzw. vergleichbare Technologien für die
              Anmeldung und Sitzungsverwaltung verwendet.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Speicherdauer</h2>
            <p className="text-muted-foreground">
              Ihre Daten bleiben gespeichert, solange Ihr Konto besteht. Sie können Ihr Konto jederzeit
              löschen; dabei werden alle personenbezogenen Daten entfernt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Konto löschen</h2>
            <p className="text-muted-foreground">
              Die Löschung ist jederzeit möglich im Dashboard unter{" "}
              <Link to="/dashboard" className="text-primary hover:underline">
                Account & Daten löschen
              </Link>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Ihre Rechte</h2>
            <p className="text-muted-foreground mb-4">
              Sie haben die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit
              und Widerspruch gemäß DSGVO.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Datensicherheit</h2>
            <p className="text-muted-foreground">
              Daten werden verschlüsselt übertragen (HTTPS). Es werden angemessene technische und
              organisatorische Maßnahmen eingesetzt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. Änderungen</h2>
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
