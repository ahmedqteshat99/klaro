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
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/brand/klaro-icon.svg"
        width={size}
        height={size}
        alt={showText ? "" : "Klaro"}
        aria-hidden={showText ? true : undefined}
        className={cn("shrink-0 select-none", iconClassName)}
        draggable={false}
      />
      {showText && (
        <span className={cn("text-xl font-extrabold tracking-tight text-foreground font-sans lowercase", textClassName)}>
          klaro
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
