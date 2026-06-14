import Image from "next/image";
import { cn } from "@/lib/utils";

type ProfileBannerProps = {
  bannerUrl?: string | null;
  className?: string;
};

export function ProfileBanner({ bannerUrl, className }: ProfileBannerProps) {
  if (bannerUrl) {
    return (
      <div
        className={cn(
          "relative h-36 sm:h-44 w-full overflow-hidden rounded-t-2xl",
          className
        )}
      >
        <Image
          src={bannerUrl}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
          priority
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-36 sm:h-44 w-full rounded-t-2xl bg-gradient-hero border-b border-border/60",
        className
      )}
      aria-hidden="true"
    />
  );
}
