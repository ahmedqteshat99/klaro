import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
    User,
    Stethoscope,
    Building2,
    GraduationCap,
    Microscope,
    Brain,
    Languages,
    Award,
    BookOpen,
    Camera,
    PenTool,
    Bell,
    HardDrive,
    Trash2,
    CheckCircle2,
    Circle,
} from "lucide-react";

export interface NavSection {
    id: string;
    label: string;
    icon: React.ReactNode;
    group: "cv" | "account";
    filled?: boolean;
}

interface SectionNavProps {
    sections: NavSection[];
}

const SectionNav = ({ sections }: SectionNavProps) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        // Clean up previous observer
        observerRef.current?.disconnect();

        const callback: IntersectionObserverCallback = (entries) => {
            // Find the first section that is intersecting from top
            const visible = entries
                .filter((e) => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

            if (visible.length > 0) {
                setActiveId(visible[0].target.id);
            }
        };

        observerRef.current = new IntersectionObserver(callback, {
            rootMargin: "-120px 0px -60% 0px",
            threshold: 0.1,
        });

        // Observe all section elements
        sections.forEach((section) => {
            const el = document.getElementById(section.id);
            if (el) observerRef.current?.observe(el);
        });

        return () => observerRef.current?.disconnect();
    }, [sections]);

    const handleClick = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const cvSections = sections.filter((s) => s.group === "cv");
    const accountSections = sections.filter((s) => s.group === "account");

    return (
        <nav className="section-nav hidden lg:block sticky top-24 space-y-1 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            {/* CV sections */}
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 py-2">
                CV-Daten
            </p>
            {cvSections.map((section) => (
                <button
                    key={section.id}
                    type="button"
                    onClick={() => handleClick(section.id)}
                    className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200",
                        activeId === section.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <span className="shrink-0 h-4 w-4">{section.icon}</span>
                    <span className="truncate flex-1">{section.label}</span>
                    {section.filled !== undefined && (
                        <span className="shrink-0">
                            {section.filled ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                                <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                        </span>
                    )}
                </button>
            ))}

            {/* Divider */}
            {accountSections.length > 0 && (
                <>
                    <div className="my-3 border-t" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 py-2">
                        Konto
                    </p>
                    {accountSections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => handleClick(section.id)}
                            className={cn(
                                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200",
                                activeId === section.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <span className="shrink-0 h-4 w-4">{section.icon}</span>
                            <span className="truncate flex-1">{section.label}</span>
                        </button>
                    ))}
                </>
            )}
        </nav>
    );
};

export { SectionNav };
export default SectionNav;
