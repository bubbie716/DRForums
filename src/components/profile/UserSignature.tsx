import { RenderedContent } from "@/components/forum/RenderedContent";
import { cn } from "@/lib/utils";

type UserSignatureProps = {
  signature?: string | null;
  className?: string;
};

export function UserSignature({ signature, className }: UserSignatureProps) {
  const trimmed = signature?.trim();
  if (!trimmed) {
    return null;
  }

  return (
    <div
      className={cn(
        "mt-4 pt-3 border-t border-border/60 text-xs text-text-secondary leading-relaxed",
        className
      )}
    >
      <RenderedContent content={trimmed} />
    </div>
  );
}
