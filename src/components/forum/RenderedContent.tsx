import { parseMentionContent } from "@/lib/mentions/parse";
import { UserProfileLink } from "@/components/profile/UserProfileLink";
import { parseBBCode } from "@/lib/bbcode";
import { BBCodeDisplay } from "@/components/forum/BBCodeDisplay";
import { cn } from "@/lib/utils";

type RenderedContentProps = {
  content: string;
  className?: string;
};

function renderTextSegment(text: string, key: string) {
  const html = parseBBCode(text);
  if (!html) {
    return null;
  }

  return <BBCodeDisplay key={key} html={html} />;
}

export function RenderedContent({ content, className }: RenderedContentProps) {
  const parts = parseMentionContent(content);

  if (parts.length === 0) {
    const html = parseBBCode(content);
    return (
      <BBCodeDisplay
        html={html}
        className={cn("text-text-primary leading-snug", className)}
      />
    );
  }

  return (
    <div className={cn("text-text-primary leading-snug", className)}>
      {parts.map((part, index) =>
        part.type === "mention" ? (
          <UserProfileLink
            key={`mention-${index}`}
            username={part.username}
            className="font-semibold text-text-dark"
          >
            @{part.username}
          </UserProfileLink>
        ) : (
          renderTextSegment(part.text, `text-${index}`)
        )
      )}
    </div>
  );
}
