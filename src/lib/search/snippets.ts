const SNIPPET_MAX_LENGTH = 150;

function stripBBCode(value: string): string {
  return value
    .replace(/\[(\/)?[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchSnippet(
  text: string,
  query: string,
  maxLength = SNIPPET_MAX_LENGTH
): string {
  const plain = stripBBCode(text);
  if (!plain) {
    return "";
  }

  const lowerPlain = plain.toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  let start = 0;
  let matchIndex = -1;

  for (const term of terms) {
    const index = lowerPlain.indexOf(term);
    if (index !== -1) {
      matchIndex = index;
      break;
    }
  }

  if (matchIndex > 40) {
    start = Math.max(0, matchIndex - 40);
  }

  let snippet = plain.slice(start, start + maxLength).trim();
  if (start > 0) {
    snippet = `…${snippet}`;
  }
  if (start + maxLength < plain.length) {
    snippet = `${snippet}…`;
  }

  return snippet;
}

export function highlightSearchTerms(text: string, query: string): string {
  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  if (terms.length === 0) {
    return escapeHtml(text);
  }

  const pattern = new RegExp(
    `(${terms.map((term) => escapeRegExp(term)).join("|")})`,
    "gi"
  );

  return escapeHtml(text).replace(
    pattern,
    '<mark class="bg-yellow/50 text-text-dark rounded px-0.5">$1</mark>'
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
