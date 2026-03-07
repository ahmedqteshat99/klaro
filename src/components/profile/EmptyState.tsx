import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
    className?: string;
}

const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center py-10 px-6",
                "border-2 border-dashed border-border/60 rounded-xl",
                "bg-muted/20",
                className
            )}
        >
            <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground/60">
                {icon}
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
            <p className="text-xs text-muted-foreground max-w-[280px] mb-4">{description}</p>
            {action}
        </div>
    );
};

export default EmptyState;
