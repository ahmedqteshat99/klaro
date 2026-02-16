import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, UserPlus } from "lucide-react";

interface JobDetailAuthGateProps {
  applyNextUrl: string;
}

const JobDetailAuthGate = ({ applyNextUrl }: JobDetailAuthGateProps) => (
  <Card className="border-primary/20">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        Mit Klaro bewerben
      </CardTitle>
      <CardDescription>
        Erstellen Sie ein kostenloses Konto, um sich mit KI-generiertem Lebenslauf und Anschreiben zu bewerben.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <Button asChild className="w-full">
        <Link to={`/auth?next=${encodeURIComponent(applyNextUrl)}`}>
          <UserPlus className="mr-2 h-4 w-4" />
          Registrieren & bewerben
        </Link>
      </Button>
      <Button asChild variant="outline" className="w-full">
        <Link to={`/auth?next=${encodeURIComponent(applyNextUrl)}`}>Bereits registriert? Anmelden</Link>
      </Button>
    </CardContent>
  </Card>
);

export default JobDetailAuthGate;
