const BLOCK_TAG_PATTERN =
  /\[(\/?)(quote|code|spoiler|list|b|i|u|s|color|size|url|img)(?:=([^\]]*))?\]/gi;

const QUOTE_PATTERN = /\[quote(?:="([^"]*)")?\]([\s\S]*?)\[\/quote\]/gi;
const CODE_PATTERN = /\[code\]([\s\S]*?)\[\/code\]/gi;
const SPOILER_PATTERN = /\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi;
const LIST_PATTERN = /\[list\]([\s\S]*?)\[\/list\]/gi;
const URL_PATTERN =
  /\[url(?:=([^\]]+))?\]([\s\S]*?)\[\/url\]/gi;
const IMG_PATTERN = /\[img(?:=(\d+))?\]([\s\S]*?)\[\/img\]/gi;
const HR_PATTERN = /\[hr\]/gi;
const INLINE_TAG_PATTERN = /\[(\/?)(b|i|u|s|color|size)(?:=([^\]]*))?\]/gi;

function normalizeQuoteUsername(raw: string | undefined): string | null {
  const cleaned = (raw ?? "")
    .replace(/\s*said:\s*$/i, "")
    .trim()
    .replace(/:+$/, "")
    .trim();

  if (!cleaned || cleaned.toLowerCase() === "quote") {
    return null;
  }

  return cleaned;
}

function quoteLabelFromUsername(username: string): string {
  return `${escapeHtml(username)}:`;
}

const ALLOWED_TAGS = new Set([
  "strong",
  "em",
  "u",
  "s",
  "blockquote",
  "pre",
  "code",
  "a",
  "img",
  "ul",
  "li",
  "span",
  "hr",
  "div",
  "p",
  "br",
  "button",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "rel", "target"]),
  img: new Set(["src", "alt", "loading", "class", "style", "width"]),
  span: new Set(["style", "class"]),
  blockquote: new Set(["class"]),
  pre: new Set(["class"]),
  code: new Set(["class"]),
  ul: new Set(["class"]),
  li: new Set(["class"]),
  div: new Set(["class", "data-bbcode-spoiler"]),
  p: new Set(["class"]),
  hr: new Set(["class"]),
  button: new Set(["type", "class"]),
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || /^\s*javascript:/i.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    try {
      const parsed = new URL(`https://${trimmed}`);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  }
}

function normalizeSafeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!isSafeUrl(trimmed)) {
    return null;
  }

  try {
    return new URL(trimmed).href;
  } catch {
    try {
      return new URL(`https://${trimmed}`).href;
    } catch {
      return null;
    }
  }
}

function isUploadedImagePath(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith("/uploads/") && !trimmed.includes("..");
}

function normalizeImageSrc(url: string): string | null {
  const trimmed = url.trim();
  if (isUploadedImagePath(trimmed)) {
    return trimmed;
  }

  return normalizeSafeUrl(trimmed);
}

function isSafeColor(color: string): boolean {
  const trimmed = color.trim();
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ||
    /^[a-z]{3,20}$/i.test(trimmed)
  );
}

function normalizeColorForBbcode(color: string): string | null {
  const trimmed = color.trim();
  if (isSafeColor(trimmed)) {
    return trimmed;
  }

  const rgbMatch = trimmed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (!rgbMatch) {
    return null;
  }

  const hex = `#${[rgbMatch[1], rgbMatch[2], rgbMatch[3]]
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`;

  return isSafeColor(hex) ? hex : null;
}

export function normalizeBbcodeColor(color: string): string | null {
  return normalizeColorForBbcode(color);
}

export function normalizeBbcodeFontSize(size: string | number): number | null {
  const parsed = parseSafeFontSize(String(size));
  if (!parsed) {
    return null;
  }

  return Number.parseInt(parsed, 10);
}

export const BBCODE_FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 32, 48] as const;

function parseSafeFontSize(size: string): string | null {
  const parsed = Number.parseInt(size.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 8 || parsed > 48) {
    return null;
  }
  return `${parsed}px`;
}

export function parseImageDisplayWidth(
  value: string | number | undefined | null
): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 50 || parsed > 1200) {
    return null;
  }

  return parsed;
}

function parseSafeImageWidth(size: string): string | null {
  const parsed = parseImageDisplayWidth(size);
  return parsed ? `${parsed}px` : null;
}

export function buildImageBbcode(url: string, width?: number | null): string {
  const trimmed = url.trim();
  const safeWidth = width ? parseImageDisplayWidth(width) : null;
  return safeWidth ? `[img=${safeWidth}]${trimmed}[/img]` : `[img]${trimmed}[/img]`;
}

function parseListItems(content: string): string {
  const items: string[] = [];

  for (const line of content.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }

    const segments = trimmedLine.includes("[]")
      ? trimmedLine.split(/\[\]/).map((segment) => segment.trim()).filter(Boolean)
      : [trimmedLine.replace(/^\[\*\]\s*/, "").trim()];

    for (const segment of segments) {
      if (!segment) {
        continue;
      }
      items.push(`<li class="bbcode-li">${parseInlineBbcode(segment)}</li>`);
    }
  }

  if (items.length === 0) {
    return "";
  }

  return `<ul class="bbcode-list">${items.join("")}</ul>`;
}

function hasParsedInlineHtml(text: string): boolean {
  return /<(?:strong|em|u|s|span|a|br)\b/i.test(text);
}

function escapeInlineBbcodeInner(inner: string): string {
  if (hasParsedInlineHtml(inner)) {
    return inner;
  }

  if (/\[[a-z]+(?:=[^\]]*)?\]/i.test(inner)) {
    return parseInlineBbcode(inner);
  }

  return escapePlainTextPreservingPlaceholders(inner);
}

function parseInlineBbcode(input: string): string {
  const wrapperTags: Array<{ tag: string; html: string }> = [
    { tag: "u", html: "u" },
    { tag: "s", html: "s" },
    { tag: "i", html: "em" },
    { tag: "b", html: "strong" },
  ];

  let text = input;

  for (let pass = 0; pass < 24; pass += 1) {
    const before = text;

    for (const { tag, html } of wrapperTags) {
      const replacePattern = new RegExp(
        `\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`,
        "gi"
      );
      text = text.replace(
        replacePattern,
        (_match, inner: string) =>
          `<${html}>${escapeInlineBbcodeInner(inner)}</${html}>`
      );
    }

    text = text.replace(
      /\[color=([^\]]+)\]((?:(?!\[color=)[\s\S])*?)\[\/color\]/gi,
      (_match, color: string, inner: string) => {
        if (!isSafeColor(color)) {
          return inner;
        }
        return `<span style="color: ${escapeHtml(color.trim())}">${escapeInlineBbcodeInner(inner)}</span>`;
      }
    );

    text = text.replace(
      /\[size=([^\]]+)\]((?:(?!\[size=)[\s\S])*?)\[\/size\]/gi,
      (_match, size: string, inner: string) => {
        const fontSize = parseSafeFontSize(size);
        if (!fontSize) {
          return inner;
        }
        return `<span style="font-size: ${fontSize}">${escapeInlineBbcodeInner(inner)}</span>`;
      }
    );

    text = text.replace(
      URL_PATTERN,
      (_match, href: string | undefined, label: string) => {
        const url = normalizeSafeUrl(href ?? label);
        const linkText = escapeHtml((label || href || "").trim());
        if (!url) {
          return linkText;
        }
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer nofollow">${linkText || escapeHtml(url)}</a>`;
      }
    );

    if (text === before) {
      break;
    }
  }

  if (hasParsedInlineHtml(text)) {
    return text;
  }

  return escapePlainTextPreservingPlaceholders(text);
}

function escapePlainTextPreservingPlaceholders(input: string): string {
  const segments = input.split(/(\uE000BB\d+\uE001)/g);

  return segments
    .map((segment) => {
      if (/^\uE000BB\d+\uE001$/.test(segment)) {
        return segment;
      }

      HR_PATTERN.lastIndex = 0;
      let escaped = escapeHtml(segment);
      escaped = escaped.replace(HR_PATTERN, '<hr class="bbcode-hr" />');
      escaped = escaped.replace(/\n/g, "<br />");
      return escaped;
    })
    .join("");
}

const BLOCK_PLACEHOLDER_PATTERN = /\uE000BB(\d+)\uE001/g;

function reserveRenderedBlock(blocks: string[], html: string): string {
  const index = blocks.length;
  blocks.push(html);
  return `\uE000BB${index}\uE001`;
}

function restoreRenderedBlocks(text: string, blocks: string[]): string {
  return text.replace(
    BLOCK_PLACEHOLDER_PATTERN,
    (_match, index: string) => blocks[Number(index)] ?? ""
  );
}

function parseToHtml(input: string): string {
  if (!input) {
    return "";
  }

  const renderedBlocks: string[] = [];
  let text = input;

  for (let pass = 0; pass < 24; pass += 1) {
    const before = text;

    text = text.replace(CODE_PATTERN, (_match, inner: string) => {
      const code = escapeHtml(inner.replace(/^\n|\n$/g, ""));
      return reserveRenderedBlock(
        renderedBlocks,
        `<pre class="bbcode-pre"><code class="bbcode-code">${code}</code></pre>`
      );
    });

    text = text.replace(
      QUOTE_PATTERN,
      (_match, username: string | undefined, inner: string) => {
        const body = parseToHtml(inner.trim());
        const normalizedUsername = normalizeQuoteUsername(username);
        if (normalizedUsername) {
          const label = quoteLabelFromUsername(normalizedUsername);
          return reserveRenderedBlock(
            renderedBlocks,
            `<blockquote class="bbcode-quote"><p class="bbcode-quote-label">${label}</p><div class="bbcode-quote-body">${body}</div></blockquote>`
          );
        }
        return reserveRenderedBlock(
          renderedBlocks,
          `<blockquote class="bbcode-quote"><p class="bbcode-quote-label">Quote:</p><div class="bbcode-quote-body">${body}</div></blockquote>`
        );
      }
    );

    text = text.replace(SPOILER_PATTERN, (_match, inner: string) => {
      const body = parseToHtml(inner.trim());
      return reserveRenderedBlock(
        renderedBlocks,
        `<div class="bbcode-spoiler"><button type="button" class="bbcode-spoiler-toggle">Spoiler</button><div class="bbcode-spoiler-content hidden">${body}</div></div>`
      );
    });

    text = text.replace(LIST_PATTERN, (_match, inner: string) => {
      return reserveRenderedBlock(renderedBlocks, parseListItems(inner));
    });

    text = text.replace(IMG_PATTERN, (_match, width: string | undefined, src: string) => {
      const url = normalizeImageSrc(src.trim());
      if (!url) {
        return "";
      }

      const safeWidth = parseSafeImageWidth(width ?? "");
      const widthStyle = safeWidth ? ` style="width: ${safeWidth}"` : "";

      return reserveRenderedBlock(
        renderedBlocks,
        `<img src="${escapeHtml(url)}" alt="" loading="lazy" class="bbcode-img"${widthStyle} />`
      );
    });

    if (text === before) {
      break;
    }
  }

  text = parseInlineBbcode(text);
  return restoreRenderedBlocks(text, renderedBlocks);
}

export function parseBBCode(input: string): string {
  if (!input) {
    return "";
  }

  const html = parseToHtml(input);
  return sanitizeBBCodeHtml(html);
}

export function sanitizeBBCodeHtml(html: string): string {
  let sanitized = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");

  sanitized = sanitized.replace(
    /<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi,
    (match, tagName: string, attrs: string) => {
      const tag = tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        return "";
      }

      if (match.startsWith("</")) {
        return `</${tag}>`;
      }

      if (tag === "br" || tag === "hr" || tag === "img") {
        return sanitizeSelfClosingTag(tag, attrs);
      }

      const allowed = ALLOWED_ATTRS[tag];
      if (!allowed) {
        return `<${tag}>`;
      }

      const safeAttrs = extractSafeAttributes(tag, attrs, allowed);
      return safeAttrs ? `<${tag} ${safeAttrs}>` : `<${tag}>`;
    }
  );

  return sanitized;
}

function sanitizeSelfClosingTag(tag: string, attrs: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed) {
    return tag === "br" ? "<br />" : `<${tag}>`;
  }

  const safeAttrs = extractSafeAttributes(tag, attrs, allowed);
  if (tag === "br") {
    return safeAttrs ? `<br ${safeAttrs} />` : "<br />";
  }
  return safeAttrs ? `<${tag} ${safeAttrs} />` : `<${tag} />`;
}

function extractSafeAttributes(
  tag: string,
  attrs: string,
  allowed: Set<string>
): string {
  const parts: string[] = [];
  const attrPattern = /([a-z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(attrs)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";

    if (!allowed.has(name)) {
      continue;
    }

    if (name === "href") {
      const url = normalizeSafeUrl(value);
      if (!url) {
        continue;
      }
      parts.push(`${name}="${escapeHtml(url)}"`);
      continue;
    }

    if (name === "src") {
      const url = normalizeImageSrc(value);
      if (!url) {
        continue;
      }
      parts.push(`${name}="${escapeHtml(url)}"`);
      continue;
    }

    if (name === "width" && tag === "img") {
      const safeWidth = parseSafeImageWidth(value.replace(/px$/i, ""));
      if (safeWidth) {
        parts.push(`width="${safeWidth.replace("px", "")}"`);
      }
      continue;
    }

    if (name === "style") {
      const safeStyle = sanitizeStyleAttribute(value, tag);
      if (safeStyle) {
        parts.push(`style="${safeStyle}"`);
      }
      continue;
    }

    if (name === "class") {
      const safeClass = value
        .split(/\s+/)
        .filter((cls) => /^[a-z0-9_-]+$/i.test(cls))
        .join(" ");
      if (safeClass) {
        parts.push(`class="${safeClass}"`);
      }
      continue;
    }

    parts.push(`${name}="${escapeHtml(value)}"`);
  }

  if (tag === "a" && parts.some((part) => part.startsWith('href="'))) {
    if (!parts.some((part) => part.startsWith('target="'))) {
      parts.push('target="_blank"');
    }
    if (!parts.some((part) => part.startsWith('rel="'))) {
      parts.push('rel="noopener noreferrer nofollow"');
    }
  }

  return parts.join(" ");
}

function sanitizeStyleAttribute(
  style: string,
  tag = ""
): string | null {
  const rules: string[] = [];
  const declarations = style.split(";");

  for (const declaration of declarations) {
    const [property, value] = declaration.split(":").map((part) => part.trim());
    if (!property || !value) {
      continue;
    }

    if (property === "color" && isSafeColor(value)) {
      rules.push(`color: ${value}`);
    }

    if (property === "font-size") {
      const size = value.endsWith("px") ? parseSafeFontSize(value.replace("px", "")) : parseSafeFontSize(value);
      if (size) {
        rules.push(`font-size: ${size}`);
      }
    }

    if (property === "width" && tag === "img") {
      const size = parseSafeImageWidth(value.replace(/px$/i, ""));
      if (size) {
        rules.push(`width: ${size}`);
      }
    }
  }

  return rules.length > 0 ? escapeHtml(rules.join("; ")) : null;
}

export function stripBBCode(input: string): string {
  let result = input;

  for (let pass = 0; pass < 8; pass += 1) {
    const before = result;
    result = result.replace(QUOTE_PATTERN, (_m, _u, inner) => inner);
    result = result.replace(CODE_PATTERN, (_m, inner) => inner);
    result = result.replace(SPOILER_PATTERN, (_m, inner) => inner);
    result = result.replace(LIST_PATTERN, (_m, inner) =>
      inner.replace(/^\s*(?:\[\*\]|\[\])\s*/gm, "")
    );
    result = result.replace(
      URL_PATTERN,
      (_m, href: string | undefined, label: string) => label || href || ""
    );
    result = result.replace(IMG_PATTERN, "");
    result = result.replace(
      /\[(b|i|u|s|color|size|url)(?:=[^\]]*)?\]([\s\S]*?)\[\/\1\]/gi,
      "$2"
    );
    result = result.replace(/\[quote(?:="[^"]*")?\]([\s\S]*?)\[\/quote\]/gi, "$1");
    result = result.replace(BLOCK_TAG_PATTERN, "");
    result = result.replace(HR_PATTERN, "");
    if (result === before) {
      break;
    }
  }

  result = result.replace(/<[^>]+>/g, " ");
  return result.replace(/\s+/g, " ").trim();
}

export function getMeaningfulContentLength(input: string): number {
  return stripBBCode(input).length;
}

function isStyleOnlySpanElement(element: HTMLElement): boolean {
  if (element.tagName !== "SPAN") {
    return false;
  }

  const decoration =
    element.style.textDecorationLine || element.style.textDecoration || "";
  if (decoration) {
    return false;
  }

  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name !== "style") {
      return false;
    }
  }

  return Boolean(element.style.color || element.style.fontSize);
}

function normalizeStyledBbcode(bbcode: string): string {
  let result = bbcode;

  for (let pass = 0; pass < 8; pass += 1) {
    const before = result;
    result = result.replace(
      /\[size=\d+\](?:\u200B|\s)*\[\/size\]/gi,
      ""
    );
    result = result.replace(
      /\[color=[^\]]+\](?:\u200B|\s)*\[\/color\]/gi,
      ""
    );
    if (result === before) {
      break;
    }
  }

  return result;
}

const LEGACY_FONT_SIZE_TO_PX: Record<string, number> = {
  "1": 10,
  "2": 12,
  "3": 14,
  "4": 16,
  "5": 18,
  "6": 24,
  "7": 48,
};

function legacyFontSizeToPx(size: string): number | null {
  return LEGACY_FONT_SIZE_TO_PX[size] ?? null;
}

function normalizeLegacyFontElements(root: HTMLElement) {
  for (const font of Array.from(root.querySelectorAll("font"))) {
    const span = document.createElement("span");
    const color = font.getAttribute("color");
    const size = font.getAttribute("size");

    if (color) {
      const normalized = normalizeColorForBbcode(color);
      if (normalized) {
        span.style.color = normalized;
      }
    }

    if (size) {
      const px = legacyFontSizeToPx(size);
      if (px) {
        span.style.fontSize = `${px}px`;
      }
    }

    while (font.firstChild) {
      span.appendChild(font.firstChild);
    }

    font.replaceWith(span);
  }
}

function styleSpansConflict(
  parent: HTMLSpanElement,
  child: HTMLSpanElement
): boolean {
  if (parent.style.color && child.style.color) {
    return true;
  }
  if (parent.style.fontSize && child.style.fontSize) {
    return true;
  }
  return false;
}

function mergeNestedStyleSpansInHtml(html: string): string {
  if (!html.trim() || typeof document === "undefined") {
    return html;
  }

  const container = document.createElement("div");
  container.innerHTML = html;

  let merged = true;
  while (merged) {
    merged = false;

    for (const span of Array.from(container.querySelectorAll("span"))) {
      if (span.childNodes.length !== 1) {
        continue;
      }

      const child = span.firstElementChild;
      if (!(child instanceof HTMLSpanElement) || !isStyleOnlySpanElement(child)) {
        continue;
      }

      if (!isStyleOnlySpanElement(span)) {
        continue;
      }

      if (styleSpansConflict(span, child)) {
        continue;
      }

      if (child.style.color && !span.style.color) {
        span.style.color = child.style.color;
      }
      if (child.style.fontSize && !span.style.fontSize) {
        span.style.fontSize = child.style.fontSize;
      }

      while (child.firstChild) {
        span.insertBefore(child.firstChild, child);
      }
      span.removeChild(child);
      merged = true;
    }
  }

  return container.innerHTML;
}

export function bbcodeHtmlForWriteEditor(bbcode: string): string {
  if (!bbcode.trim()) {
    return "";
  }

  const html = parseBBCode(normalizeStyledBbcode(bbcode))
    .replace(
      /<button type="button" class="bbcode-spoiler-toggle">Spoiler<\/button>/g,
      ""
    )
    .replace(
      /class="bbcode-spoiler-content hidden"/g,
      'class="bbcode-spoiler-content"'
    );

  return mergeNestedStyleSpansInHtml(html);
}

function serializeStyleSpan(element: HTMLElement): string {
  const decoration =
    element.style.textDecorationLine || element.style.textDecoration || "";
  if (decoration.includes("underline")) {
    return `[u]${serializeElementChildren(element)}[/u]`;
  }
  if (decoration.includes("line-through")) {
    return `[s]${serializeElementChildren(element)}[/s]`;
  }

  let color = element.style.color;
  let fontSize = element.style.fontSize;
  let children = serializeElementChildren(element);

  const soleChild =
    element.childNodes.length === 1 ? element.firstElementChild : null;
  if (
    soleChild instanceof HTMLSpanElement &&
    isStyleOnlySpanElement(soleChild) &&
    !styleSpansConflict(element as HTMLSpanElement, soleChild)
  ) {
    if (!color && soleChild.style.color) {
      color = soleChild.style.color;
    }
    if (!fontSize && soleChild.style.fontSize) {
      fontSize = soleChild.style.fontSize;
    }
    children = serializeElementChildren(soleChild);
  }

  const visibleChildren = children.replace(/\u200B/g, "").trim();
  if (!visibleChildren) {
    return "";
  }

  let result = children;
  if (fontSize) {
    const size = Number.parseInt(fontSize, 10);
    if (Number.isFinite(size)) {
      result = `[size=${size}]${result}[/size]`;
    }
  }
  if (color) {
    const normalizedColor = normalizeColorForBbcode(color);
    if (normalizedColor) {
      result = `[color=${normalizedColor}]${result}[/color]`;
    }
  }
  return result;
}

function serializeElementChildren(element: Element): string {
  return serializeNodes(element.childNodes);
}

function serializeNodes(nodes: NodeListOf<ChildNode> | ChildNode[]): string {
  let result = "";

  for (const node of nodes) {
    result += serializeNode(node);
  }

  return result;
}

function serializeNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = serializeElementChildren(element);

  switch (tag) {
    case "strong":
    case "b":
      return `[b]${children}[/b]`;
    case "em":
    case "i":
      return `[i]${children}[/i]`;
    case "u":
      return `[u]${children}[/u]`;
    case "s":
    case "strike":
    case "del":
      return `[s]${children}[/s]`;
    case "br":
      return "\n";
    case "a": {
      const href = element.getAttribute("href") ?? "";
      if (!href) {
        return children;
      }
      const label = children.trim() || href;
      return `[url=${href}]${label}[/url]`;
    }
    case "blockquote": {
      const label = element.querySelector(".bbcode-quote-label")?.textContent ?? "";
      const bodyNode = element.querySelector(".bbcode-quote-body");
      const body = bodyNode ? serializeElementChildren(bodyNode) : children;
      const username = normalizeQuoteUsername(label);
      if (username) {
        return `[quote="${username}"]${body}[/quote]`;
      }
      return `[quote]${body}[/quote]`;
    }
    case "pre":
      return `[code]${element.textContent ?? ""}[/code]`;
    case "code":
      if (element.parentElement?.tagName.toLowerCase() === "pre") {
        return element.textContent ?? "";
      }
      return `[code]${element.textContent ?? ""}[/code]`;
    case "img": {
      const src = element.getAttribute("src") ?? "";
      if (!src) {
        return "";
      }

      const widthFromStyle = element.style.width.replace(/px$/i, "");
      const widthFromAttr = element.getAttribute("width") ?? "";
      const width = parseImageDisplayWidth(widthFromStyle || widthFromAttr);

      return width ? `[img=${width}]${src}[/img]` : `[img]${src}[/img]`;
    }
    case "ul": {
      const items = Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((item) => `[]${serializeElementChildren(item)}`)
        .join("\n");
      return `[list]\n${items}\n[/list]`;
    }
    case "li":
      return children;
    case "div":
      if (element.classList.contains("bbcode-spoiler")) {
        const content = element.querySelector(".bbcode-spoiler-content");
        const body = content ? serializeElementChildren(content) : children;
        return `[spoiler]${body}[/spoiler]`;
      }
      if (element.classList.contains("bbcode-quote-body")) {
        return children;
      }
      return `${children}\n`;
    case "p":
      if (element.classList.contains("bbcode-write-exit")) {
        return "\n";
      }
      if (element.classList.contains("bbcode-quote-label")) {
        return "";
      }
      return `${children}\n`;
    case "hr":
      return "[hr]";
    case "span": {
      return serializeStyleSpan(element);
    }
    case "font": {
      let inner = children;
      const fontSizeAttr = element.getAttribute("size");
      if (fontSizeAttr) {
        const px = legacyFontSizeToPx(fontSizeAttr);
        if (px) {
          inner = `[size=${px}]${inner}[/size]`;
        }
      }
      const normalizedFontColor = normalizeColorForBbcode(
        element.getAttribute("color") ?? ""
      );
      if (normalizedFontColor) {
        return `[color=${normalizedFontColor}]${inner}[/color]`;
      }
      return inner;
    }
    default:
      return children;
  }
}

export function htmlToBbcode(html: string): string {
  if (typeof document === "undefined" || !html.trim()) {
    return "";
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  normalizeLegacyFontElements(container);
  return normalizeStyledBbcode(
    serializeNodes(container.childNodes)
      .replace(/\u200B/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

void INLINE_TAG_PATTERN;
void BLOCK_TAG_PATTERN;
