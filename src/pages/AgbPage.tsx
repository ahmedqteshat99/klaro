import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import BrandLogo from "@/components/BrandLogo";

const AgbPage = () => {
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
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Allgemeine Geschäftsbedingungen (AGB)
        </h1>

        <div className="prose prose-lg max-w-none text-foreground">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Geltungsbereich</h2>
            <p className="text-muted-foreground mb-4">
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Plattform
              Klaro (im Folgenden „Plattform" oder „Dienst"), betrieben durch:
            </p>
            <p className="text-muted-foreground">
              Ahmed Quteishat<br />
              Arad, Rumänien<br />
              E-Mail: ahmedqteshat99@gmail.com
            </p>
            <p className="text-muted-foreground mt-4">
              Mit der Registrierung und Nutzung der Plattform akzeptieren Sie diese AGB vollständig.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Leistungsbeschreibung</h2>
            <p className="text-muted-foreground mb-4">
              Klaro ist eine Plattform zur Unterstützung von Ärztinnen und Ärzten (insbesondere
              Assistenzärzte) bei der Erstellung professioneller Bewerbungsunterlagen (Lebenslauf
              und Anschreiben) mittels KI-Technologie (Anthropic Claude).
            </p>
            <h3 className="text-lg font-semibold mb-3">Unsere Dienstleistungen umfassen:</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Speicherung Ihrer Profildaten (medizinische Ausbildung, Berufserfahrung, Qualifikationen)</li>
              <li>KI-gestützte Generierung von Lebensläufen und Anschreiben</li>
              <li>Verwaltung und Versionierung Ihrer Bewerbungsdokumente</li>
              <li>Stellenanzeigen-Aggregation (öffentlich zugängliche Angebote)</li>
              <li>E-Mail-Kommunikation mit Arbeitgebern über personalisierte Klaro-Adressen</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Nutzerpflichten</h2>
            <h3 className="text-lg font-semibold mb-3">3.1 Wahrheitsgemäße Angaben</h3>
            <p className="text-muted-foreground mb-4">
              Sie verpflichten sich, ausschließlich <strong>wahrheitsgemäße und vollständige</strong> Informationen
              zu Ihrer Person, Ausbildung und Berufserfahrung anzugeben. Falsche Angaben können zur
              sofortigen Sperrung Ihres Kontos führen.
            </p>

            <h3 className="text-lg font-semibold mb-3">3.2 Eigenverantwortung für generierte Inhalte</h3>
            <p className="text-muted-foreground mb-4">
              <strong>Wichtig:</strong> Die KI generiert Texte auf Basis Ihrer Angaben, kann aber Fehler,
              Ungenauigkeiten oder unangemessene Formulierungen enthalten. Sie sind <strong>selbst
              verantwortlich</strong> für die Richtigkeit, Vollständigkeit und Angemessenheit aller
              Bewerbungsunterlagen, die Sie an Arbeitgeber senden.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>Sie müssen ALLE KI-generierten Inhalte vor der Verwendung sorgfältig prüfen und ggf. anpassen.</strong>
            </p>

            <h3 className="text-lg font-semibold mb-3">3.3 Kontosicherheit</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Sie sind verantwortlich für die Geheimhaltung Ihrer Zugangsdaten</li>
              <li>Verwenden Sie ein sicheres Passwort (mindestens 12 Zeichen, Groß-/Kleinbuchstaben, Ziffern, Sonderzeichen)</li>
              <li>Teilen Sie Ihre Zugangsdaten niemals mit Dritten</li>
              <li>Benachrichtigen Sie uns unverzüglich bei Verdacht auf unbefugten Zugriff</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Verbotene Aktivitäten</h2>
            <p className="text-muted-foreground mb-4">
              Die folgenden Aktivitäten sind strikt untersagt und führen zur sofortigen Kontosperrung:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Scraping & Automatisierung:</strong> Automatisiertes Auslesen von Daten, Nutzung von Bots oder Crawlern</li>
              <li><strong>Spam & Missbrauch:</strong> Massenversand von E-Mails, Belästigung von Arbeitgebern</li>
              <li><strong>Manipulation:</strong> Umgehung technischer Schutzmechanismen, SQL-Injection, XSS-Angriffe</li>
              <li><strong>Identitätsdiebstahl:</strong> Nutzung falscher Identitäten oder Zugangsdaten Dritter</li>
              <li><strong>Illegale Inhalte:</strong> Hochladen oder Versenden rechtwidriger, beleidigender oder diskriminierender Inhalte</li>
              <li><strong>Kommerzielle Nutzung:</strong> Weiterverkauf oder kommerzielle Verwertung der Plattform ohne Genehmigung</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Verfügbarkeit & Gewährleistung</h2>
            <h3 className="text-lg font-semibold mb-3">5.1 Keine Verfügbarkeitsgarantie</h3>
            <p className="text-muted-foreground mb-4">
              Wir bemühen uns um eine hohe Verfügbarkeit der Plattform, können jedoch <strong>keine
              100%ige Verfügbarkeit garantieren</strong>. Wartungsarbeiten, technische Störungen oder
              höhere Gewalt können zu Ausfallzeiten führen.
            </p>

            <h3 className="text-lg font-semibold mb-3">5.2 Keine Erfolgsgarantie</h3>
            <p className="text-muted-foreground mb-4">
              Wir garantieren <strong>nicht</strong>, dass die Nutzung unserer Plattform zu erfolgreichen
              Bewerbungen oder Jobzusagen führt. Die Qualität der Bewerbungsunterlagen und der Erfolg
              bei Bewerbungen hängen von vielen Faktoren ab, die außerhalb unserer Kontrolle liegen.
            </p>

            <h3 className="text-lg font-semibold mb-3">5.3 Stellenanzeigen von Drittanbietern</h3>
            <p className="text-muted-foreground mb-4">
              Stellenanzeigen auf Klaro stammen von externen Websites (Krankenhäuser, Kliniken).
              Wir übernehmen <strong>keine Haftung</strong> für die Richtigkeit, Aktualität oder
              Verfügbarkeit dieser Angebote. Prüfen Sie immer die Originalanzeige beim Arbeitgeber.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Haftungsbeschränkung</h2>
            <h3 className="text-lg font-semibold mb-3">6.1 Haftung für KI-generierte Inhalte</h3>
            <p className="text-muted-foreground mb-4">
              Wir haften <strong>nicht</strong> für Fehler, Ungenauigkeiten oder rechtliche Probleme,
              die durch die Verwendung KI-generierter Texte entstehen. Die finale Verantwortung für
              die Richtigkeit Ihrer Bewerbungsunterlagen liegt bei Ihnen.
            </p>

            <h3 className="text-lg font-semibold mb-3">6.2 Haftung für Datenverlust</h3>
            <p className="text-muted-foreground mb-4">
              Obwohl wir regelmäßige Backups durchführen, übernehmen wir <strong>keine Garantie</strong> für
              die Wiederherstellung verlorener Daten bei technischen Defekten. Sichern Sie wichtige
              Dokumente lokal (Download-Funktion nutzen).
            </p>

            <h3 className="text-lg font-semibold mb-3">6.3 Haftungsausschluss (soweit gesetzlich zulässig)</h3>
            <p className="text-muted-foreground mb-4">
              Wir haften nur für Vorsatz und grobe Fahrlässigkeit. Die Haftung für leichte Fahrlässigkeit
              ist ausgeschlossen, soweit nicht wesentliche Vertragspflichten (Kardinalpflichten) betroffen
              sind. Im Fall der Verletzung wesentlicher Vertragspflichten ist die Haftung auf den
              vorhersehbaren, vertragstypischen Schaden begrenzt.
            </p>
            <p className="text-muted-foreground text-sm">
              Die Haftung für Personenschäden (Leben, Körper, Gesundheit) bleibt hiervon unberührt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Datenaufbewahrung & Kontolöschung</h2>
            <h3 className="text-lg font-semibold mb-3">7.1 Inaktive Konten</h3>
            <p className="text-muted-foreground mb-4">
              Wenn Sie sich <strong>24 Monate lang</strong> nicht einloggen oder die Plattform nicht nutzen,
              wird Ihr Konto automatisch gelöscht. Sie erhalten Warnungen nach 18 und 22 Monaten Inaktivität.
            </p>
            <p className="text-muted-foreground mb-4">
              Details siehe{" "}
              <Link to="/datenaufbewahrung" className="text-primary hover:underline">
                Datenaufbewahrungsrichtlinie
              </Link>
              .
            </p>

            <h3 className="text-lg font-semibold mb-3">7.2 Freiwillige Kontolöschung</h3>
            <p className="text-muted-foreground mb-4">
              Sie können Ihr Konto jederzeit selbst löschen unter{" "}
              <Link to="/dashboard" className="text-primary hover:underline">
                Dashboard → Profil & Einstellungen → Konto löschen
              </Link>
              . Die Löschung ist <strong>endgültig und unwiderruflich</strong>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Kündigung & Sperrung</h2>
            <h3 className="text-lg font-semibold mb-3">8.1 Kündigung durch Sie</h3>
            <p className="text-muted-foreground mb-4">
              Sie können die Nutzung jederzeit beenden, indem Sie Ihr Konto löschen (siehe Abschnitt 7.2).
            </p>

            <h3 className="text-lg font-semibold mb-3">8.2 Sperrung durch uns</h3>
            <p className="text-muted-foreground mb-4">
              Wir behalten uns vor, Ihr Konto <strong>ohne Vorankündigung</strong> zu sperren oder zu löschen, wenn:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Sie gegen diese AGB verstoßen (insbesondere verbotene Aktivitäten gemäß Abschnitt 4)</li>
              <li>Sie falsche Identitätsangaben machen</li>
              <li>Ihr Konto für illegale Aktivitäten genutzt wird</li>
              <li>Wir rechtlich dazu verpflichtet sind (z. B. behördliche Anordnung)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Im Fall schwerwiegender Verstöße können wir rechtliche Schritte einleiten.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Änderungen der AGB</h2>
            <p className="text-muted-foreground mb-4">
              Wir behalten uns vor, diese AGB jederzeit zu ändern. Sie werden über Änderungen per
              E-Mail oder durch einen Hinweis beim Login informiert.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>Wenn Sie den geänderten AGB nicht zustimmen, können Sie Ihr Konto löschen.</strong> Die
              fortgesetzte Nutzung nach Bekanntgabe der Änderungen gilt als Zustimmung zu den neuen AGB.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. E-Mail-Kommunikation</h2>
            <p className="text-muted-foreground mb-4">
              Über Klaro erhalten Sie eine personalisierte E-Mail-Adresse für die Bewerbungskommunikation
              (z. B. <code className="text-sm bg-muted px-1 py-0.5 rounded">ihr-name@reply.klaro.tools</code>).
            </p>
            <h3 className="text-lg font-semibold mb-3">Sie verpflichten sich:</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Diese E-Mail-Adresse <strong>ausschließlich für Bewerbungskommunikation</strong> zu verwenden</li>
              <li>Keine illegalen, beleidigenden oder Spam-Inhalte zu versenden oder zu empfangen</li>
              <li>Verdächtige oder unangemessene E-Mails sofort zu melden</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Missbrauch führt zur sofortigen Sperrung Ihrer E-Mail-Funktion und Ihres Kontos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Geistiges Eigentum</h2>
            <p className="text-muted-foreground mb-4">
              <strong>Ihre Inhalte:</strong> Sie behalten alle Rechte an Ihren eingegebenen Daten und
              generierten Dokumenten. Wir nutzen Ihre Daten ausschließlich zur Bereitstellung der Dienste
              (siehe{" "}
              <Link to="/datenschutz" className="text-primary hover:underline">
                Datenschutzerklärung
              </Link>
              ).
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>Unsere Inhalte:</strong> Die Plattform (Design, Code, Markenname „Klaro") ist
              urheberrechtlich geschützt. Jegliche Vervielfältigung, Verbreitung oder kommerzielle
              Nutzung ohne Genehmigung ist untersagt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. Anwendbares Recht & Gerichtsstand</h2>
            <p className="text-muted-foreground mb-4">
              Auf diese AGB findet <strong>deutsches Recht</strong> Anwendung unter Ausschluss des
              UN-Kaufrechts (CISG).
            </p>
            <p className="text-muted-foreground mb-4">
              Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesen AGB ist,
              soweit gesetzlich zulässig, <strong>Arad, Rumänien</strong>.
            </p>
            <p className="text-muted-foreground text-sm">
              Zwingende gesetzliche Bestimmungen zum Verbraucherschutz (insbesondere Ihr Wohn sitzgerichtsstand)
              bleiben hiervon unberührt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">13. Salvatorische Klausel</h2>
            <p className="text-muted-foreground">
              Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein oder werden,
              so wird dadurch die Wirksamkeit der übrigen Bestimmungen nicht berührt. Die unwirksame
              Bestimmung wird durch eine wirksame ersetzt, die dem wirtschaftlichen Zweck der
              unwirksamen Bestimmung am nächsten kommt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">14. Kontakt</h2>
            <p className="text-muted-foreground mb-4">
              Bei Fragen zu diesen AGB kontaktieren Sie uns bitte:
            </p>
            <p className="text-muted-foreground">
              <strong>E-Mail:</strong>{" "}
              <a href="mailto:ahmedqteshat99@gmail.com" className="text-primary hover:underline">
                ahmedqteshat99@gmail.com
              </a>
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

export default AgbPage;
