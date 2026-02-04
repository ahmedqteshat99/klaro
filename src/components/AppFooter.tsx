import { Link } from "react-router-dom";

const AppFooter = () => {
  return (
    <footer className="border-t border-border/50 py-6 mt-10">
      <div className="container mx-auto px-6 text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link to="/datenschutz" className="hover:text-foreground transition-colors">
            Datenschutz
          </Link>
          <Link to="/impressum" className="hover:text-foreground transition-colors">
            Impressum
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span>Privates MVP (nicht-kommerziell)</span>
          <span>•</span>
          <span>Experimentelles Projekt ohne Gewähr</span>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
