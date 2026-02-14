import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import BrandLogo from "@/components/BrandLogo";

const ImpressumPage = () => {
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
        <h1 className="text-3xl font-bold text-foreground mb-8">Impressum</h1>

        <div className="prose prose-lg max-w-none text-foreground">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Angaben gemäß § 5 TMG</h2>
            <p className="text-muted-foreground">
              Privatperson (nicht-kommerziell)<br />
              Name: Ahmed Quteishat<br />
              Stadt: Arad, Rumänien<br />
              E-Mail: ahmedqteshat99@gmail.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Verantwortlich für Inhalte nach § 18 Abs. 2 MStV</h2>
            <p className="text-muted-foreground">
              Ahmed Quteishat<br />
              Arad, Rumänien
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Hinweis zu KI-generierten Inhalten</h2>
            <p className="text-muted-foreground">
              Texte werden automatisch mit KI erzeugt und sollten vor Verwendung überprüft werden.
              Es wird keine Gewähr für Richtigkeit, Aktualität oder Vollständigkeit übernommen.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Haftung für Inhalte</h2>
            <p className="text-muted-foreground">
              Die Inhalte wurden mit Sorgfalt erstellt, eine Gewähr für Richtigkeit, Vollständigkeit
              und Aktualität kann jedoch nicht übernommen werden.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Haftung für Links</h2>
            <p className="text-muted-foreground">
              Externe Links wurden zum Zeitpunkt der Verlinkung geprüft. Für die Inhalte verlinkter
              Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Urheberrecht</h2>
            <p className="text-muted-foreground">
              Die Inhalte dieser Website unterliegen dem Urheberrecht. Eine Nutzung außerhalb der
              gesetzlichen Grenzen bedarf der vorherigen Zustimmung des jeweiligen Rechteinhabers.
            </p>
          </section>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default ImpressumPage;
