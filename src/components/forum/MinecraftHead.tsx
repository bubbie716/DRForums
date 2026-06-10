import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getMinecraftHeadUrl,
  resolveMinecraftHeadUsername,
} from "@/lib/minecraft-head";

type MinecraftHeadProps = {
  seed?: string;
  minecraftUsername?: string | null;
  profileUsername?: string | null;
  size?: number;
  className?: string;
};

export function MinecraftHead({
  seed,
  minecraftUsername,
  profileUsername,
  size = 44,
  className,
}: MinecraftHeadProps) {
  const username = resolveMinecraftHeadUsername(
    seed ?? "default",
    minecraftUsername
  );
  const src = getMinecraftHeadUrl(username, size);

  const image = (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={cn(
        "rounded-lg border border-border bg-surface shrink-0",
        className
      )}
    />
  );

  if (profileUsername) {
    return (
      <Link
        href={`/profile/${profileUsername}`}
        className="profile-head-link inline-block shrink-0 rounded-lg transition-opacity hover:opacity-85"
        aria-label={`View ${profileUsername}'s profile`}
      >
        {image}
      </Link>
    );
  }

  return image;
}
