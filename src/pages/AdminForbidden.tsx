import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const AdminForbidden = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Zugriff verweigert
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sie haben keine Berechtigung, diesen Bereich zu öffnen.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/">Zur Startseite</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminForbidden;
