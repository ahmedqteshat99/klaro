import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveIndicatorProps {
    status: SaveStatus;
    className?: string;
}

const AutoSaveIndicator = ({ status, className }: AutoSaveIndicatorProps) => {
    if (status === "idle") return null;

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium transition-opacity duration-300",
                status === "saving" && "text-muted-foreground animate-pulse",
                status === "saved" && "text-green-600 dark:text-green-400",
                status === "error" && "text-destructive",
                className
            )}
        >
            {status === "saving" && (
                <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Speichert…</span>
                </>
            )}
            {status === "saved" && (
                <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Gespeichert</span>
                </>
            )}
            {status === "error" && (
                <>
                    <AlertCircle className="h-3 w-3" />
                    <span>Fehler beim Speichern</span>
                </>
            )}
        </div>
    );
};

export default AutoSaveIndicator;
