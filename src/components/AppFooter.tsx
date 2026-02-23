import { Link } from "react-router-dom";

const AppFooter = () => {
  return (
    <footer className="py-8" style={{ borderTop: '1px solid var(--notion-border, rgba(0,0,0,0.08))', background: 'var(--notion-bg-base, #f9f9f8)' }}>
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 text-xs flex flex-col md:flex-row items-center justify-between gap-3" style={{ color: 'var(--notion-text-muted, #a39e98)' }}>
        <div className="flex items-center gap-5">
          <Link to="/agb" className="hover:opacity-70 transition-opacity">
            AGB
          </Link>
          <Link to="/datenschutz" className="hover:opacity-70 transition-opacity">
            Datenschutz
          </Link>
          <Link to="/impressum" className="hover:opacity-70 transition-opacity">
            Impressum
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span>Privates MVP (nicht-kommerziell)</span>
          <span>·</span>
          <span>Experimentelles Projekt ohne Gewähr</span>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
