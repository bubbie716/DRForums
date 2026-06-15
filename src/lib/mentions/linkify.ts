import { parseBBCode } from "@/lib/bbcode";
import { MENTION_USERNAME_PATTERN } from "@/lib/mentions/parse";

const MENTION_IN_TEXT_REGEX = new RegExp(
  `@(${MENTION_USERNAME_PATTERN.source})\\b`,
  "gi"
);

const SKIP_ANCESTOR_TAGS = new Set(["pre", "code", "a"]);
const VOID_TAGS = new Set(["br", "hr", "img"]);

const MENTION_LINK_CLASS =
  "profile-name profile-link forum-title-link transition-colors duration-200 font-semibold";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseTagName(tagContent: string): {
  name: string;
  isClosing: boolean;
  isSelfClosing: boolean;
} | null {
  const trimmed = tagContent.trim();
  if (!trimmed) {
    return null;
  }

  const isClosing = trimmed.startsWith("/");
  const withoutSlash = isClosing ? trimmed.slice(1) : trimmed;
  const nameMatch = withoutSlash.match(/^([a-z][a-z0-9]*)\b/i);
  if (!nameMatch) {
    return null;
  }

  return {
    name: nameMatch[1].toLowerCase(),
    isClosing,
    isSelfClosing: !isClosing && /\/\s*$/.test(trimmed),
  };
}

function linkifyMentionsInText(text: string): string {
  return text.replace(MENTION_IN_TEXT_REGEX, (_match, username: string) => {
    const normalized = username.toLowerCase();
    return `<a href="/profile/${escapeHtml(normalized)}" class="${MENTION_LINK_CLASS}">@${escapeHtml(username)}</a>`;
  });
}

export function linkifyMentionsInHtml(html: string): string {
  let result = "";
  let index = 0;
  const tagStack: string[] = [];

  while (index < html.length) {
    if (html[index] === "<") {
      const tagEnd = html.indexOf(">", index);
      if (tagEnd === -1) {
        result += html.slice(index);
        break;
      }

      const parsed = parseTagName(html.slice(index + 1, tagEnd));
      if (parsed) {
        if (parsed.isClosing) {
          const stackIndex = tagStack.lastIndexOf(parsed.name);
          if (stackIndex !== -1) {
            tagStack.splice(stackIndex, 1);
          }
        } else if (!VOID_TAGS.has(parsed.name) && !parsed.isSelfClosing) {
          tagStack.push(parsed.name);
        }
      }

      result += html.slice(index, tagEnd + 1);
      index = tagEnd + 1;
      continue;
    }

    const nextTag = html.indexOf("<", index);
    const textEnd = nextTag === -1 ? html.length : nextTag;
    const text = html.slice(index, textEnd);
    const shouldSkip = tagStack.some((tag) => SKIP_ANCESTOR_TAGS.has(tag));
    result += shouldSkip ? text : linkifyMentionsInText(text);
    index = textEnd;
  }

  return result;
}

export function parseBBCodeWithMentions(content: string): string {
  const html = parseBBCode(content);
  if (!html) {
    return "";
  }

  return linkifyMentionsInHtml(html);
}
