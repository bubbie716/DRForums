/** Matches @username tokens (same rules as forum usernames). */
export const MENTION_USERNAME_PATTERN = /[a-z0-9_]{3,20}/;

const MENTION_REGEX = new RegExp(
  `@(${MENTION_USERNAME_PATTERN.source})\\b`,
  "gi"
);

export function extractMentionUsernames(content: string): string[] {
  const usernames = new Set<string>();

  for (const match of content.matchAll(MENTION_REGEX)) {
    usernames.add(match[1].toLowerCase());
  }

  return [...usernames];
}

export type MentionContentPart =
  | { type: "text"; text: string }
  | { type: "mention"; username: string };

export function parseMentionContent(content: string): MentionContentPart[] {
  const parts: MentionContentPart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MENTION_REGEX)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, index) });
    }

    parts.push({ type: "mention", username: match[1].toLowerCase() });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }

  return parts;
}

export function getActiveMentionAtCursor(
  text: string,
  cursor: number
): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([a-z0-9_]*)$/i);

  if (!match) {
    return null;
  }

  return {
    query: match[1].toLowerCase(),
    start: cursor - match[0].length,
  };
}
