import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

const ComingSoonPage = () => {
  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-2xl flex-col items-center justify-center text-center">
        <div className="mb-8">
          <BrandLogo />
        </div>
        <span className="mb-4 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Website Update
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Coming Soon
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Wir arbeiten gerade an der neuen Hauptseite. Bald sind wir wieder online.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/impressum">Impressum</Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default ComingSoonPage;
