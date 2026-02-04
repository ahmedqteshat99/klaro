import { cn } from "@/lib/utils";

const DisclaimerBanner = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground",
        className
      )}
    >
      <p>
        Privates, experimentelles Projekt ohne Gewähr.
        Die generierten Texte basieren ausschließlich auf Ihren Angaben und
        stellen keine Rechts- oder Medizinberatung dar.
      </p>
    </div>
  );
};

export default DisclaimerBanner;
