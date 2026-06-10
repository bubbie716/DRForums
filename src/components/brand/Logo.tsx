import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg" | "hero";
  showText?: boolean;
  className?: string;
  href?: string;
};

const sizes = {
  sm: { image: 36, text: "text-sm" },
  md: { image: 44, text: "text-base" },
  lg: { image: 52, text: "text-lg" },
  hero: { image: 280, text: "text-2xl" },
};

export function Logo({
  size = "md",
  showText = true,
  className,
  href = "/",
}: LogoProps) {
  const config = sizes[size];
  const isHero = size === "hero";

  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/district-roleplay-logo.png"
        alt="District Roleplay"
        width={config.image}
        height={config.image}
        className={cn(
          "rounded-xl object-contain shrink-0",
          isHero && "opacity-[0.12]"
        )}
        priority={size === "md" || size === "lg"}
      />
      {showText && !isHero && (
        <div>
          <div
            className={cn(
              "font-bold text-text-primary leading-tight",
              config.text
            )}
          >
            District Roleplay
          </div>
          <div className="text-xs text-text-secondary -mt-0.5">
            Municipal Forum
          </div>
        </div>
      )}
    </div>
  );

  if (isHero) {
    return content;
  }

  return (
    <Link href={href} className="group">
      {content}
    </Link>
  );
}
