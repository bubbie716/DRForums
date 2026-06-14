import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getMinecraftHeadUrl,
  resolveMinecraftHeadUsername,
} from "@/lib/minecraft-head";

type UserAvatarProps = {
  seed: string;
  avatarUrl?: string | null;
  minecraftUsername?: string | null;
  profileUsername?: string | null;
  size?: number;
  square?: boolean;
  className?: string;
  imageClassName?: string;
};

export function UserAvatar({
  seed,
  avatarUrl,
  minecraftUsername,
  profileUsername,
  size = 44,
  square = false,
  className,
  imageClassName,
}: UserAvatarProps) {
  const username = resolveMinecraftHeadUsername(seed, minecraftUsername);
  const src = avatarUrl ?? getMinecraftHeadUrl(username, size);

  const image = (
    <div
      className={cn(
        "shrink-0 overflow-hidden border border-border bg-surface",
        square ? "rounded-none" : "rounded-lg",
        imageClassName
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        unoptimized={!avatarUrl || avatarUrl.startsWith("/uploads/")}
        className="h-full w-full object-cover"
      />
    </div>
  );

  const wrapped = profileUsername ? (
    <Link
      href={`/profile/${profileUsername}`}
      className={cn(
        "profile-head-link inline-block shrink-0 transition-opacity hover:opacity-85",
        square ? "rounded-none" : "rounded-lg"
      )}
      aria-label={`View ${profileUsername}'s profile`}
    >
      {image}
    </Link>
  ) : (
    image
  );

  return <div className={cn("shrink-0", className)}>{wrapped}</div>;
}
