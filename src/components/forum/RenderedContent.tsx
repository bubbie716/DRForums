import { MentionContent } from "@/components/mentions/MentionContent";
import { parseQuoteContent } from "@/lib/quoteParser";
import { cn } from "@/lib/utils";

type RenderedContentProps = {
  content: string;
  className?: string;
};

function QuoteCard({
  username,
  content,
}: {
  username: string;
  content: string;
}) {
  return (
    <div className="mb-2 rounded-lg border-l-4 border-accent bg-yellow/25 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-accent-dark mb-1">
        {username} said:
      </p>
      <MentionContent
        content={content}
        className="text-sm text-text-primary leading-snug whitespace-pre-wrap break-words"
      />
    </div>
  );
}

export function RenderedContent({ content, className }: RenderedContentProps) {
  const parts = parseQuoteContent(content);

  if (parts.length === 1 && parts[0].type === "text") {
    return (
      <MentionContent content={content} className={className} />
    );
  }

  return (
    <div className={cn(className)}>
      {parts.map((part, index) =>
        part.type === "quote" ? (
          <QuoteCard
            key={`quote-${index}`}
            username={part.username}
            content={part.content}
          />
        ) : (
          <MentionContent
            key={`text-${index}`}
            content={part.content}
            className="text-text-primary leading-snug whitespace-pre-wrap break-words"
          />
        )
      )}
    </div>
  );
}
