import { parseBBCodeWithMentions } from "@/lib/mentions/linkify";
import { BBCodeDisplay } from "@/components/forum/BBCodeDisplay";
import { cn } from "@/lib/utils";

type RenderedContentProps = {
  content: string;
  className?: string;
};

export function RenderedContent({ content, className }: RenderedContentProps) {
  const html = parseBBCodeWithMentions(content);

  if (!html) {
    return null;
  }

  return (
    <BBCodeDisplay
      html={html}
      className={cn("text-text-primary leading-snug", className)}
    />
  );
}
