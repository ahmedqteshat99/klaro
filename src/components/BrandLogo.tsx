import { useId } from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  size?: number;
}

const BrandLogo = ({
  className,
  iconClassName,
  textClassName,
  showText = true,
  size = 40,
}: BrandLogoProps) => {
  const gradientId = useId();
  const iconSize = Math.round(size * 0.7);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-xl bg-white shadow-apple flex items-center justify-center",
          iconClassName
        )}
        style={{ width: size, height: size }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`klaro-grad-${gradientId}`} x1="8" y1="8" x2="56" y2="56">
              <stop offset="0%" stopColor="#31c6d8" />
              <stop offset="100%" stopColor="#4ad6a6" />
            </linearGradient>
          </defs>
          <g stroke={`url(#klaro-grad-${gradientId})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="32,8 51,18.5 51,45.5 32,56 13,45.5 13,18.5" />
            <line x1="32" y1="8" x2="32" y2="56" />
            <line x1="13" y1="18.5" x2="51" y2="45.5" />
            <line x1="51" y1="18.5" x2="13" y2="45.5" />
          </g>
          <g fill={`url(#klaro-grad-${gradientId})`}>
            <circle cx="32" cy="8" r="3.5" />
            <circle cx="51" cy="18.5" r="3.5" />
            <circle cx="51" cy="45.5" r="3.5" />
            <circle cx="32" cy="56" r="3.5" />
            <circle cx="13" cy="45.5" r="3.5" />
            <circle cx="13" cy="18.5" r="3.5" />
            <rect x="29" y="22" width="6" height="20" rx="2.5" />
            <rect x="22" y="29" width="20" height="6" rx="2.5" />
          </g>
        </svg>
      </div>
      {showText && (
        <span className={cn("text-lg font-semibold text-foreground tracking-tight", textClassName)}>
          Klaro
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
