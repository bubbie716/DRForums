import { parseMentionContent } from "@/lib/mentions/parse";
import { UserProfileLink } from "@/components/profile/UserProfileLink";

type MentionContentProps = {
  content: string;
  className?: string;
};

export function MentionContent({ content, className }: MentionContentProps) {
  const parts = parseMentionContent(content);

  if (parts.length === 0) {
    return <span className={className}>{content}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.type === "text" ? (
          <span key={index}>{part.text}</span>
        ) : (
          <UserProfileLink
            key={index}
            username={part.username}
            className="font-semibold text-text-dark"
          >
            @{part.username}
          </UserProfileLink>
        )
      )}
    </span>
  );
}
