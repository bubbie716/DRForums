export type QuoteContentPart =
  | { type: "quote"; username: string; content: string }
  | { type: "text"; content: string };

const MAX_QUOTED_LENGTH = 1000;

function getQuoteBlockRegex(): RegExp {
  return /\[quote="([^"]*)"\]([\s\S]*?)\[\/quote\]/gi;
}

export function stripQuoteBlocks(content: string): string {
  return content.replace(getQuoteBlockRegex(), "").trim();
}

export function getNonQuoteText(content: string): string {
  return stripQuoteBlocks(content).trim();
}

export function hasNonQuoteContent(content: string): boolean {
  return getNonQuoteText(content).length > 0;
}

export function parseQuoteContent(content: string): QuoteContentPart[] {
  const parts: QuoteContentPart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(getQuoteBlockRegex())) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      const text = content.slice(lastIndex, index).trim();
      if (text) {
        parts.push({ type: "text", content: text });
      }
    }

    parts.push({
      type: "quote",
      username: match[1],
      content: match[2].trim(),
    });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      parts.push({ type: "text", content: text });
    }
  }

  if (parts.length === 0 && content) {
    parts.push({ type: "text", content });
  }

  return parts;
}

export function prepareQuotedContent(content: string): string {
  let text = stripQuoteBlocks(content).trim();

  if (text.length > MAX_QUOTED_LENGTH) {
    text = `${text.slice(0, MAX_QUOTED_LENGTH).trimEnd()}...`;
  }

  return text;
}

function sanitizeQuoteUsername(username: string): string {
  return username.replace(/"/g, "'");
}

export function buildQuoteMarkup(username: string, content: string): string {
  const sanitizedUsername = sanitizeQuoteUsername(username);
  const quotedText = prepareQuotedContent(content);

  return `[quote="${sanitizedUsername}"]\n${quotedText}\n[/quote]\n\n`;
}
