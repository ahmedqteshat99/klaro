import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  size?: number;
  logoSrc?: string;
}

const BrandLogo = ({
  className,
  iconClassName,
  textClassName,
  showText = true,
  size = 40,
  logoSrc = "/brand/klaro-icon.svg",
}: BrandLogoProps) => {
  const isOldLogo = logoSrc.includes("klaro-icon.svg");

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logoSrc}
        width={isOldLogo ? size : undefined}
        height={size}
        alt={isOldLogo && !showText ? "Klaro" : "klaro für Ärzte"}
        aria-hidden={isOldLogo && showText ? true : undefined}
        className={cn("shrink-0 select-none h-auto", iconClassName)}
        draggable={false}
        style={{ height: `${size}px` }}
      />
      {isOldLogo && showText && (
        <span className={cn("text-xl font-extrabold tracking-tight text-foreground font-sans lowercase", textClassName)}>
          klaro
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
