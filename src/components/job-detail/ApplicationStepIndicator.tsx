import { Check } from "lucide-react";

type StepStatus = "completed" | "current" | "pending";

interface ApplicationStepIndicatorProps {
  /** Whether the user has documents (step 1 relevant) */
  hasDocuments: boolean;
  /** Whether application has been prepared (step 2 done) */
  isPrepared: boolean;
  /** Whether currently preparing */
  isPreparing: boolean;
}

const steps = [
  { label: "Unterlagen" },
  { label: "Vorbereiten" },
  { label: "Senden" },
];

const ApplicationStepIndicator = ({
  hasDocuments,
  isPrepared,
  isPreparing,
}: ApplicationStepIndicatorProps) => {
  const getStatus = (index: number): StepStatus => {
    if (isPrepared) {
      return index <= 1 ? "completed" : "current";
    }
    if (isPreparing) {
      return index === 0 ? "completed" : index === 1 ? "current" : "pending";
    }
    // Default: step 1 is current
    return index === 0 ? "current" : "pending";
  };

  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, index) => {
        const status = getStatus(index);
        return (
          <div key={step.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold transition-colors ${
                  status === "completed"
                    ? "bg-primary text-primary-foreground"
                    : status === "current"
                      ? "bg-primary/15 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {status === "completed" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  status === "pending"
                    ? "text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 rounded-full -mt-4 ${
                  status === "completed" ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ApplicationStepIndicator;
