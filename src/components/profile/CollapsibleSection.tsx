import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
    id: string;
    icon: ReactNode;
    title: string;
    subtitle?: string;
    summary?: string;
    accentColor?: string;
    defaultOpen?: boolean;
    children: ReactNode;
}

const CollapsibleSection = ({
    id,
    icon,
    title,
    subtitle,
    summary,
    accentColor = "hsl(var(--primary))",
    defaultOpen = false,
    children,
}: CollapsibleSectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div
            id={id}
            className="collapsible-section scroll-mt-28 rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
            {/* Header — always visible */}
            <button
                type="button"
                onClick={() => setIsOpen((o) => !o)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
            >
                {/* Accent icon */}
                <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}
                >
                    <span style={{ color: accentColor }}>{icon}</span>
                </div>

                {/* Title + summary */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
                    {!isOpen && summary && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{summary}</p>
                    )}
                    {isOpen && subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                    )}
                </div>

                {/* Chevron */}
                <ChevronDown
                    className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Collapsible content */}
            <div
                className={cn(
                    "collapsible-body overflow-hidden transition-all duration-300 ease-in-out",
                    isOpen ? "grid-rows-open" : "grid-rows-closed"
                )}
                style={{
                    display: "grid",
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                }}
            >
                <div className="min-h-0">
                    <div className="px-5 pb-5">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollapsibleSection;
