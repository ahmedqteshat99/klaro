import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

const JobDetailNotFound = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center">
      <div className="rounded-full bg-muted p-5 mb-5">
        <SearchX className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Stelle nicht gefunden
      </h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Diese Stellenanzeige ist nicht mehr verfügbar oder wurde entfernt.
      </p>
      <Button asChild>
        <Link to="/jobs">Alle Stellen ansehen</Link>
      </Button>
    </div>
  </div>
);

export default JobDetailNotFound;
