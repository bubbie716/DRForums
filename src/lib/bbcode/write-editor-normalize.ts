import {
  normalizeBbcodeColor,
  normalizeBbcodeFontSize,
} from "@/lib/bbcode";

export type WriteRunStyles = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color: string | null;
  fontSize: number | null;
};

export type WriteFormatKey = keyof Pick<
  WriteRunStyles,
  "bold" | "italic" | "underline" | "strikethrough"
>;

const STRAY_HTML_TAG_PATTERN =
  /<\/?(?:b|i|u|s|strike|del|strong|em)\b[^>]*>/gi;

function isFormattingElement(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase();
  const decoration =
    element.style.textDecorationLine || element.style.textDecoration || "";

  return (
    tag === "b" ||
    tag === "strong" ||
    tag === "i" ||
    tag === "em" ||
    tag === "u" ||
    tag === "s" ||
    tag === "strike" ||
    tag === "del" ||
    (tag === "span" &&
      (Boolean(element.style.color) ||
        Boolean(element.style.fontSize) ||
        element.style.fontWeight === "bold" ||
        Number.parseInt(element.style.fontWeight, 10) >= 600 ||
        element.style.fontStyle === "italic" ||
        decoration.includes("underline") ||
        decoration.includes("line-through")))
  );
}

export function cleanWriteTextContent(text: string): string {
  return text.replace(/\u200B/g, "").replace(STRAY_HTML_TAG_PATTERN, "");
}

export function collectWriteRunStyles(
  textNode: Text,
  root: HTMLElement
): WriteRunStyles {
  const styles: WriteRunStyles = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    color: null,
    fontSize: null,
  };

  let node: Node | null = textNode.parentElement;
  while (node && node !== root) {
    if (!(node instanceof HTMLElement)) {
      node = node.parentElement;
      continue;
    }

    const tag = node.tagName.toLowerCase();
    const decoration =
      node.style.textDecorationLine || node.style.textDecoration || "";

    if (
      tag === "b" ||
      tag === "strong" ||
      node.style.fontWeight === "bold" ||
      Number.parseInt(node.style.fontWeight, 10) >= 600
    ) {
      styles.bold = true;
    }
    if (tag === "i" || tag === "em" || node.style.fontStyle === "italic") {
      styles.italic = true;
    }
    if (tag === "u" || decoration.includes("underline")) {
      styles.underline = true;
    }
    if (
      tag === "s" ||
      tag === "strike" ||
      tag === "del" ||
      decoration.includes("line-through")
    ) {
      styles.strikethrough = true;
    }
    if (!styles.color && node.style.color) {
      styles.color = normalizeBbcodeColor(node.style.color);
    }
    if (!styles.fontSize && node.style.fontSize) {
      styles.fontSize = normalizeBbcodeFontSize(
        Number.parseInt(node.style.fontSize, 10)
      );
    }

    node = node.parentElement;
  }

  return styles;
}

function hasWriteRunFormatting(styles: WriteRunStyles): boolean {
  return (
    styles.bold ||
    styles.italic ||
    styles.underline ||
    styles.strikethrough ||
    Boolean(styles.color) ||
    Boolean(styles.fontSize)
  );
}

function applyWriteRunStyles(span: HTMLSpanElement, styles: WriteRunStyles) {
  if (styles.color) {
    span.style.color = styles.color;
  }
  if (styles.fontSize) {
    span.style.fontSize = `${styles.fontSize}px`;
  }
  if (styles.bold) {
    span.style.fontWeight = "bold";
  }
  if (styles.italic) {
    span.style.fontStyle = "italic";
  }

  const decorations: string[] = [];
  if (styles.underline) {
    decorations.push("underline");
  }
  if (styles.strikethrough) {
    decorations.push("line-through");
  }
  if (decorations.length > 0) {
    span.style.textDecorationLine = decorations.join(" ");
    span.style.textDecorationColor = styles.color ?? "currentColor";
  }
}

function findTextPositionInEditor(
  editor: HTMLElement,
  targetOffset: number
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let visibleOffset = 0;
  let current = walker.nextNode();

  while (current) {
    const raw = current.textContent ?? "";
    let rawOffset = 0;

    while (rawOffset < raw.length) {
      if (raw[rawOffset] !== "\u200B") {
        if (visibleOffset === targetOffset) {
          return { node: current as Text, offset: rawOffset };
        }
        visibleOffset += 1;
      }
      rawOffset += 1;
    }

    current = walker.nextNode();
  }

  const textNodes: Text[] = [];
  const endWalker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let endNode = endWalker.nextNode();
  while (endNode) {
    textNodes.push(endNode as Text);
    endNode = endWalker.nextNode();
  }

  const lastNode = textNodes[textNodes.length - 1];
  if (!lastNode) {
    return null;
  }

  return {
    node: lastNode,
    offset: (lastNode.textContent ?? "").length,
  };
}

export function getWriteSelectionOffsets(
  editor: HTMLElement
): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) {
    return null;
  }

  const measureRange = document.createRange();
  measureRange.selectNodeContents(editor);
  measureRange.setEnd(range.startContainer, range.startOffset);
  const start = cleanWriteTextContent(measureRange.toString()).length;

  measureRange.setEnd(range.endContainer, range.endOffset);
  const end = cleanWriteTextContent(measureRange.toString()).length;

  return { start, end };
}

export function restoreWriteSelectionOffsets(
  editor: HTMLElement,
  start: number,
  end: number
): void {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const startPos = findTextPositionInEditor(editor, start);
  const endPos = findTextPositionInEditor(editor, end);
  if (!startPos || !endPos) {
    return;
  }

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function firstTextNodeIn(root: HTMLElement): Text | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (cleanWriteTextContent(current.textContent ?? "").length > 0) {
      return current as Text;
    }
    current = walker.nextNode();
  }
  return null;
}

export type WriteRunStyleUpdates = Partial<{
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color: string | null;
  fontSize: number | null;
}>;

const LEGACY_INLINE_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "del",
] as const;

function defaultWriteRunStyles(): WriteRunStyles {
  return {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    color: null,
    fontSize: null,
  };
}

export function applyWriteRunToRange(
  range: Range,
  updates: WriteRunStyleUpdates
): HTMLSpanElement | null {
  const holder = document.createElement("div");
  holder.appendChild(range.extractContents());

  const text = cleanWriteTextContent(holder.textContent ?? "");
  if (!text) {
    return null;
  }

  const sampleText = firstTextNodeIn(holder);
  const styles = sampleText
    ? collectWriteRunStyles(sampleText, holder)
    : defaultWriteRunStyles();

  if (updates.bold !== undefined) {
    styles.bold = updates.bold;
  }
  if (updates.italic !== undefined) {
    styles.italic = updates.italic;
  }
  if (updates.underline !== undefined) {
    styles.underline = updates.underline;
  }
  if (updates.strikethrough !== undefined) {
    styles.strikethrough = updates.strikethrough;
  }
  if (updates.color !== undefined) {
    styles.color = updates.color;
  }
  if (updates.fontSize !== undefined) {
    styles.fontSize = updates.fontSize;
  }

  const span = document.createElement("span");
  applyWriteRunStyles(span, styles);
  span.textContent = text;
  range.insertNode(span);
  return span;
}

export function toggleWriteInlineFormatOnRange(
  range: Range,
  formatKey: WriteFormatKey,
  enable: boolean
): void {
  const span = applyWriteRunToRange(range, { [formatKey]: enable });
  if (!span) {
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(nextRange);
}

function removeStrayFormatTextNodes(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const toRemove: Text[] = [];
  let current = walker.nextNode();

  while (current) {
    const raw = current.textContent ?? "";
    const cleaned = cleanWriteTextContent(raw);

    if (!cleaned) {
      toRemove.push(current as Text);
    } else if (cleaned !== raw.replace(/\u200B/g, "")) {
      (current as Text).textContent = cleaned;
    }

    current = walker.nextNode();
  }

  for (const node of toRemove) {
    node.remove();
  }
}

function unwrapLegacyInlineFormatElements(root: HTMLElement): void {
  for (const tagName of LEGACY_INLINE_TAGS) {
    const elements = Array.from(root.querySelectorAll(tagName));

    for (const element of elements) {
      const parent = element.parentNode;
      if (!parent) {
        continue;
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
    }
  }
}

function normalizeWriteEditorHtmlPass(editor: HTMLElement): void {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    if (cleanWriteTextContent(current.textContent ?? "").length > 0) {
      textNodes.push(current as Text);
    }
    current = walker.nextNode();
  }

  for (const textNode of textNodes) {
    if (!editor.contains(textNode)) {
      continue;
    }

    const styles = collectWriteRunStyles(textNode, editor);
    if (!hasWriteRunFormatting(styles)) {
      continue;
    }

    const text = cleanWriteTextContent(textNode.textContent ?? "");
    if (!text) {
      textNode.textContent = "";
      continue;
    }

    const span = document.createElement("span");
    applyWriteRunStyles(span, styles);
    span.textContent = text;
    textNode.replaceWith(span);

    let parent = span.parentElement;
    while (parent && parent !== editor && isFormattingElement(parent)) {
      const grandParent = parent.parentElement;
      const onlyChild =
        parent.childNodes.length === 1 && parent.firstChild === span;

      if (!onlyChild) {
        break;
      }

      parent.replaceWith(span);
      parent = grandParent;
    }
  }
}

export function editorNeedsNormalize(editor: HTMLElement): boolean {
  const html = editor.innerHTML;
  if (/<(?:b|strong|i|em|u|s|strike|del)\b/i.test(html)) {
    return true;
  }

  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (STRAY_HTML_TAG_PATTERN.test(current.textContent ?? "")) {
      return true;
    }
    current = walker.nextNode();
  }

  return false;
}

export function normalizeWriteEditorHtml(editor: HTMLElement): void {
  for (let pass = 0; pass < 6; pass += 1) {
    const before = editor.innerHTML;
    normalizeWriteEditorHtmlPass(editor);
    removeStrayFormatTextNodes(editor);
    unwrapLegacyInlineFormatElements(editor);
    removeStrayFormatTextNodes(editor);

    if (editor.innerHTML === before) {
      break;
    }
  }
}
