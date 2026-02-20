import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type StepStatus = "pending" | "in_progress" | "completed" | "error";

export interface PreparationStep {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  errorMessage?: string;
}

interface PreparationProgressModalProps {
  open: boolean;
  steps: PreparationStep[];
  onClose: () => void;
}

function StepIcon({ status }: { status: StepStatus }) {
  return (
    <AnimatePresence mode="wait">
      {status === "pending" && (
        <motion.div
          key="pending"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30"
        >
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        </motion.div>
      )}
      {status === "in_progress" && (
        <motion.div
          key="in_progress"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-primary/10"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </motion.div>
      )}
      {status === "completed" && (
        <motion.div
          key="completed"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </motion.div>
      )}
      {status === "error" && (
        <motion.div
          key="error"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StepConnector({ status }: { status: "pending" | "active" | "completed" }) {
  return (
    <div className="ml-[15px] h-6 w-0.5 bg-muted-foreground/20 relative overflow-hidden">
      <motion.div
        className="absolute inset-x-0 top-0 bg-emerald-500"
        initial={{ height: 0 }}
        animate={{ height: status === "completed" ? "100%" : status === "active" ? "50%" : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

const STEP_DESCRIPTIONS: Record<string, Record<StepStatus, string>> = {
  lebenslauf: {
    pending: "Wird als Nächstes erstellt",
    in_progress: "Ihr Lebenslauf wird erstellt...",
    completed: "Lebenslauf fertig",
    error: "Lebenslauf fehlgeschlagen",
  },
  anschreiben: {
    pending: "Wird nach dem Lebenslauf erstellt",
    in_progress: "Anschreiben wird generiert...",
    completed: "Anschreiben fertig",
    error: "Anschreiben fehlgeschlagen",
  },
  email: {
    pending: "Wird als Letztes vorbereitet",
    in_progress: "Bewerbung wird vorbereitet...",
    completed: "E-Mail bereit zum Versand",
    error: "Vorbereitung fehlgeschlagen",
  },
};

const PreparationProgressModal = ({
  open,
  steps,
  onClose,
}: PreparationProgressModalProps) => {
  const allCompleted = steps.length > 0 && steps.every((s) => s.status === "completed");
  const hasError = steps.some((s) => s.status === "error");
  const isInProgress = steps.some((s) => s.status === "in_progress");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isInProgress && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        hideClose={isInProgress}
        onPointerDownOutside={(e) => isInProgress && e.preventDefault()}
        onEscapeKeyDown={(e) => isInProgress && e.preventDefault()}
      >
        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          {allCompleted
            ? "Bewerbung bereit!"
            : hasError
              ? "Vorbereitung fehlgeschlagen"
              : "Bewerbung wird vorbereitet..."}
        </DialogTitle>

        <div className="py-2">
          {steps.map((step, index) => {
            const descriptions = STEP_DESCRIPTIONS[step.id];
            const displayDescription =
              step.status === "error" && step.errorMessage
                ? step.errorMessage
                : descriptions?.[step.status] ?? step.description;

            // Connector status
            const connectorStatus =
              step.status === "completed"
                ? "completed"
                : step.status === "in_progress"
                  ? "active"
                  : "pending";

            return (
              <div key={step.id}>
                <motion.div
                  className="flex items-center gap-4 py-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <StepIcon status={step.status} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium transition-colors duration-300 ${
                        step.status === "completed"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : step.status === "in_progress"
                            ? "text-primary"
                            : step.status === "error"
                              ? "text-destructive"
                              : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p
                      className={`text-xs transition-colors duration-300 ${
                        step.status === "error"
                          ? "text-destructive/80"
                          : step.status === "completed"
                            ? "text-emerald-600/70 dark:text-emerald-400/70"
                            : "text-muted-foreground"
                      }`}
                    >
                      {displayDescription}
                    </p>
                  </div>
                </motion.div>
                {index < steps.length - 1 && <StepConnector status={connectorStatus} />}
              </div>
            );
          })}
        </div>

        {allCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button onClick={onClose} className="w-full">
              Weiter
            </Button>
          </motion.div>
        )}

        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button onClick={onClose} variant="outline" className="w-full">
              Schließen
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PreparationProgressModal;
