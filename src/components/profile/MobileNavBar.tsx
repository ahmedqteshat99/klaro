import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavSection {
    id: string;
    label: string;
    icon: ReactNode;
    filled?: boolean;
}

interface MobileNavBarProps {
    sections: NavSection[];
}

const MobileNavBar = ({ sections }: MobileNavBarProps) => {
    const [activeId, setActiveId] = useState<string>(sections[0]?.id || "");
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeButtonRef = useRef<HTMLButtonElement | null>(null);

    // Observe sections to track active one
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                }
            },
            { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
        );

        for (const section of sections) {
            const el = document.getElementById(section.id);
            if (el) observer.observe(el);
        }

        return () => observer.disconnect();
    }, [sections]);

    // Auto-scroll the active pill into view
    useEffect(() => {
        if (activeButtonRef.current) {
            activeButtonRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
            });
        }
    }, [activeId]);

    const handleClick = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-t shadow-lg">
            <div
                ref={scrollRef}
                className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto no-scrollbar"
            >
                {sections.map((section) => {
                    const isActive = activeId === section.id;
                    return (
                        <button
                            key={section.id}
                            ref={isActive ? activeButtonRef : undefined}
                            onClick={() => handleClick(section.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <span className="h-3.5 w-3.5">{section.icon}</span>
                            <span>{section.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileNavBar;
