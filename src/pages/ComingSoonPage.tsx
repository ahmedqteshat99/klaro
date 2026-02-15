import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ComingSoonPage = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  useEffect(() => {
    document.title = "Bald verfügbar - Assistenzarzt Pro";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-primary animate-pulse" />
              <Clock className="h-8 w-8 text-muted-foreground absolute -bottom-2 -right-2" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold">
            Bald verfügbar
          </CardTitle>
          <CardDescription className="text-lg">
            Wir arbeiten hart daran, Assistenzarzt Pro noch besser zu machen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              Was erwartet Sie?
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground ml-7">
              <li>• Optimierte KI-gestützte CV- und Anschreiben-Generierung</li>
              <li>• Verbesserte Stellensuche und Job-Matching</li>
              <li>• Neue Features für Ihre Bewerbungen</li>
              <li>• Noch bessere Benutzerfreundlichkeit</li>
            </ul>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-center">
              <strong>Gute Nachrichten!</strong> Wir werden Sie benachrichtigen, sobald die Plattform wieder verfügbar ist.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Abmelden
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Vielen Dank für Ihre Geduld und Ihr Vertrauen in Assistenzarzt Pro
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoonPage;
