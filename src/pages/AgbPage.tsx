
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import BrandLogo from "@/components/BrandLogo";

const AGBPage = () => {
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
        <h1 className="text-3xl font-bold text-foreground mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>

        <div className="prose prose-lg max-w-none text-foreground">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Geltungsbereich</h2>
            <p className="text-muted-foreground mb-4">
              Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") regeln die Nutzung der Plattform "Klaro" (nachfolgend "Dienst"),
              betrieben von Ahmed Quteishat (nachfolgend "Anbieter").
            </p>
            <p className="text-muted-foreground">
              Mit der Registrierung oder Nutzung des Dienstes erklären Sie sich mit diesen AGB einverstanden.
              Der Dienst richtet sich an Ärzte und medizinische Fachkräfte (Verbraucher im Sinne des § 13 BGB und Unternehmer im Sinne des § 14 BGB).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Leistungsbeschreibung</h2>
            <p className="text-muted-foreground mb-4">
              Klaro stellt Werkzeuge zur Erstellung, Verwaltung und Optimierung von Bewerbungsunterlagen bereit.
              Die Funktionen umfassen unter anderem:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Import und Analyse von Lebensläufen</li>
              <li>Generierung von Anschreiben mithilfe künstlicher Intelligenz (KI)</li>
              <li>Verwaltung von Bewerbungen</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Der Anbieter bemüht sich um eine ständige Verfügbarkeit, garantiert jedoch keine unterbrechungsfreie Erreichbarkeit
              oder Fehlerfreiheit des Dienstes. Es handelt sich um eine Beta-Version.
            </p>
          </section>

          <section className="mb-8 p-4 bg-muted/50 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4 text-destructive">3. Haftungsausschluss für KI-Inhalte</h2>
            <p className="text-muted-foreground font-medium mb-2">
              ⚠️ WICHTIG: Prüfungspflicht des Nutzers
            </p>
            <p className="text-muted-foreground mb-4">
              Der Dienst nutzt künstliche Intelligenz (Drittanbieter Anthropic Claude) zur Erstellung von Texten.
              Der Anbieter übernimmt **keine Haftung** für:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Die inhaltliche Richtigkeit, Vollständigkeit oder Aktualität der generierten Dokumente.</li>
              <li>Sogenannte "Halluzinationen" (Erfindung von Fakten) durch die KI.</li>
              <li>Rechtliche Nachteile, die aus der Verwendung fehlerhafter Bewerbungsunterlagen entstehen (z.B. Ablehnung, Arbeitsrechtliche Konsequenzen).</li>
            </ul>
            <p className="text-muted-foreground mt-4 font-bold">
              Der Nutzer ist allein verantwortlich, alle erstellten Inhalte vor der Verwendung sorgfältig zu prüfen und ggf. zu korrigieren.
            </p>
          </section>

          <section className="mb-8 p-4 bg-muted/50 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4 text-destructive">4. Nutzung von Stellenanzeigen (Scraping)</h2>
            <p className="text-muted-foreground mb-4">
              Die Funktion "Stellenanzeige importieren" dient ausschließlich dazu, dem Nutzer das Abtippen von Daten für das eigene Anschreiben zu ersparen.
            </p>
            <p className="text-muted-foreground mb-4">
              Der Nutzer versichert, dass er:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Berechtigt ist, die Inhalte der verlinkten Stellenanzeige für private Bewerbungszwecke zu verarbeiten.</li>
              <li>Den Dienst nicht für systematisches Auslesen (Screen Scraping) oder den Aufbau eigener Datenbanken missbraucht.</li>
              <li>Keine Rechte Dritter (insb. Urheber- und Datenbankrechte von Stellenbörsen) verletzt.</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Der Anbieter speichert die Inhalte der importierten Anzeige nur temporär zur Erstellung des Anschreibens und macht sich diese Inhalte nicht zu eigen.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Nutzerpflichten</h2>
            <p className="text-muted-foreground mb-4">
              Der Nutzer verpflichtet sich:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Wahrheitsgemäße Angaben bei der Registrierung und in den Profil-Daten zu machen.</li>
              <li>Zugangsdaten geheim zu halten und vor Zugriff Dritter zu schützen.</li>
              <li>Den Dienst nicht missbräuchlich zu nutzen (z.B. keine Schadsoftware verbreiten, keine Rechte Dritter verletzen).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Haftungsbeschränkung</h2>
            <p className="text-muted-foreground mb-4">
              Der Anbieter haftet unbeschränkt nur für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens,
              des Körpers oder der Gesundheit.
            </p>
            <p className="text-muted-foreground">
              Für leichte Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten),
              wobei die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt ist. Die Haftung für Datenverlust wird auf den typischen Wiederherstellungsaufwand beschränkt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Laufzeit und Kündigung</h2>
            <p className="text-muted-foreground">
              Der Nutzungsvertrag läuft auf unbestimmte Zeit. Der Nutzer kann sein Konto jederzeit über die Einstellungen löschen.
              Der Anbieter kann den Dienst jederzeit mit einer Frist von 2 Wochen einstellen oder den Nutzer sperren.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Schlussbestimmungen</h2>
            <p className="text-muted-foreground mb-4">
              Es gilt das Recht der Bundesrepublik Deutschland.
              Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
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

export default AGBPage;
