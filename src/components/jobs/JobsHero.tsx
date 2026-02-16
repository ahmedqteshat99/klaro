import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface JobsHeroProps {
  jobCount: number;
  isLoading: boolean;
}

const JobsHero = ({ jobCount, isLoading }: JobsHeroProps) => (
  <div className="pt-16 sm:pt-20">
    <div className="bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b border-border/50">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Assistenzarzt-Stellen
        </h1>
        <p className="text-muted-foreground mt-2 text-base sm:text-lg max-w-xl">
          Finden Sie Ihre nächste Stelle und bewerben Sie sich direkt mit Klaro.
        </p>
        {!isLoading && (
          <div className="mt-4 flex items-center gap-3">
            <Badge variant="secondary" className="text-sm px-3 py-1 font-medium">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {jobCount} {jobCount === 1 ? "offene Stelle" : "offene Stellen"}
            </Badge>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default JobsHero;
