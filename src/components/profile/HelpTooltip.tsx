import { HelpCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpTooltipProps {
    text: string;
}

const HelpTooltip = ({ text }: HelpTooltipProps) => {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        tabIndex={-1}
                    >
                        <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs">
                    <p>{text}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default HelpTooltip;
