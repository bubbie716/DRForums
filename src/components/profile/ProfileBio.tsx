import { RenderedContent } from "@/components/forum/RenderedContent";
import { cn } from "@/lib/utils";

type ProfileBioProps = {
  bio?: string | null;
  className?: string;
};

export function ProfileBio({ bio, className }: ProfileBioProps) {
  const trimmed = bio?.trim();
  if (!trimmed) {
    return null;
  }

  return (
    <RenderedContent
      content={trimmed}
      className={cn("text-sm text-text-primary leading-relaxed", className)}
    />
  );
}
