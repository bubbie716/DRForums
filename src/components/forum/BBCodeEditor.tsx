"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MentionTextarea } from "@/components/mentions/MentionTextarea";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { searchMentionUsers } from "@/lib/mentions/actions";
import {
  getContentEditableCaretOffset,
  getContentEditablePlainText,
  getTextOffsetCaretRect,
  replaceTextRangeInContentEditable,
} from "@/lib/mentions/contentEditable";
import { getActiveMentionAtCursor } from "@/lib/mentions/parse";
import { textareaClassName } from "@/components/ui/AutoResizeTextarea";
import {
  DropdownPortal,
  dropdownPanelClassName,
  toDropdownPanelStyle,
  useAnchoredFixedPosition,
  useDismissOnOutside,
} from "@/components/ui/dropdown";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputClassName } from "@/components/ui/fieldStyles";
import {
  bbcodeHtmlForWriteEditor,
  htmlToBbcode,
  BBCODE_ALIGNMENTS,
  normalizeBbcodeColor,
  normalizeBbcodeFontSize,
  type BbcodeAlignment,
} from "@/lib/bbcode";
import {
  applyWriteRunToRange,
  editorNeedsNormalize,
  getWriteSelectionOffsets,
  normalizeWriteEditorHtml,
  restoreWriteSelectionOffsets,
  toggleWriteInlineFormatOnRange,
} from "@/lib/bbcode/write-editor-normalize";
import {
  preserveWindowScroll,
  restoreScrollPosition,
} from "@/lib/autoResizeField";
import { cn } from "@/lib/utils";

type EditorMode = "write" | "bbcode";

const FONT_COLOR_PRESETS = [
  { label: "Default", value: "#111827" },
  { label: "Gray", value: "#6b7280" },
  { label: "Orange", value: "#e29027" },
  { label: "Dark orange", value: "#b56d15" },
  { label: "Red", value: "#dc2626" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#16a34a" },
  { label: "Purple", value: "#9333ea" },
] as const;

const DEFAULT_TEXT_COLOR = "#111827";
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 48;

type TextStyleState = {
  color: string | null;
  fontSize: number | null;
};

type SelectedImageOverlay = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const MIN_IMAGE_WIDTH = 50;
const MAX_IMAGE_WIDTH = 1200;
const MENTION_POPUP_WIDTH = 176;
const MENTION_POPUP_OFFSET_X = 6;
const MENTION_POPUP_OFFSET_Y = 2;

type MentionUser = {
  id: string;
  username: string;
  minecraftUsername: string | null;
  avatarUrl: string | null;
};

type MentionPopupPosition = {
  top: number;
  left: number;
};

type BBCodeEditorProps = {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  id?: string;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
};

type FormatKey = "bold" | "italic" | "underline" | "strikethrough";

type ActiveFormats = Record<FormatKey, boolean>;

type ToolbarAction = {
  label: string;
  title: string;
  onClick: () => void;
  labelClassName?: string;
  formatKey?: FormatKey;
};

type LinkContext =
  | { mode: "bbcode"; start: number; end: number }
  | { mode: "write" };

function isValidImageUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    );
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeImageUrl(url: string) {
  const trimmed = url.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function toolbarButtonClassName(isActive = false) {
  return cn(
    "min-h-9 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors",
    isActive
      ? "bg-yellow/40 text-accent-dark border-accent/30"
      : "border-border bg-white text-text-secondary hover:bg-yellow/30 hover:text-accent-dark hover:border-accent/30"
  );
}

function isInsideBbcodeTag(
  value: string,
  position: number,
  tag: string
): boolean {
  return findEnclosingBbcodeTagBounds(value, position, tag) !== null;
}

function findEnclosingBbcodeTagBounds(
  value: string,
  position: number,
  tag: string
) {
  const tagRegex = new RegExp(`\\[(\\/?)${tag}(?:=[^\\]]*)?\\]`, "gi");
  const stack: { openStart: number; openEnd: number }[] = [];
  let innermost: {
    openStart: number;
    openEnd: number;
    closeStart: number;
    closeEnd: number;
  } | null = null;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(value)) !== null) {
    if (match[1] === "/") {
      const open = stack.pop();
      if (!open) {
        continue;
      }

      const closeStart = match.index;
      const closeEnd = match.index + match[0].length;
      if (position >= open.openEnd && position <= closeStart) {
        innermost = {
          openStart: open.openStart,
          openEnd: open.openEnd,
          closeStart,
          closeEnd,
        };
      }
    } else {
      stack.push({
        openStart: match.index,
        openEnd: match.index + match[0].length,
      });
    }
  }

  return innermost;
}

const WRITE_COMMANDS: Record<FormatKey, string> = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  strikethrough: "strikeThrough",
};

const WRITE_ALIGN_COMMANDS: Record<BbcodeAlignment, string> = {
  left: "justifyLeft",
  center: "justifyCenter",
  right: "justifyRight",
  justify: "justifyFull",
};

const ALIGN_LABELS: Record<BbcodeAlignment, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
  justify: "Justify",
};

function getBbcodeFormatState(
  value: string,
  position: number
): ActiveFormats {
  return {
    bold: isInsideBbcodeTag(value, position, "b"),
    italic: isInsideBbcodeTag(value, position, "i"),
    underline: isInsideBbcodeTag(value, position, "u"),
    strikethrough: isInsideBbcodeTag(value, position, "s"),
  };
}

function getBbcodeSelectionKey(
  selectionStart: number,
  selectionEnd: number
): string {
  return `bbcode:${selectionStart}:${selectionEnd}`;
}

function getWriteSelectionKey(
  editor: HTMLElement | null,
  selection: Selection | null
): string {
  if (!editor || !selection || selection.rangeCount === 0) {
    return "";
  }

  const range = selection.getRangeAt(0);
  return `write:${range.startOffset}:${range.endOffset}:${range.startContainer === range.endContainer}:${selection.anchorNode?.textContent?.length ?? 0}`;
}

function getTextDecoration(element: HTMLElement): string {
  return element.style.textDecorationLine || element.style.textDecoration || "";
}

function elementHasFormat(element: HTMLElement, formatKey: FormatKey): boolean {
  const tag = element.tagName;

  switch (formatKey) {
    case "bold":
      return (
        tag === "B" ||
        tag === "STRONG" ||
        element.style.fontWeight === "bold" ||
        Number.parseInt(element.style.fontWeight, 10) >= 600
      );
    case "italic":
      return (
        tag === "I" ||
        tag === "EM" ||
        element.style.fontStyle === "italic"
      );
    case "underline":
      return tag === "U" || getTextDecoration(element).includes("underline");
    case "strikethrough":
      return (
        tag === "S" ||
        tag === "STRIKE" ||
        tag === "DEL" ||
        getTextDecoration(element).includes("line-through")
      );
  }
}

function getWriteFormatStateFromEditor(
  editor: HTMLElement | null,
  selection: Selection | null
): ActiveFormats {
  const inactive: ActiveFormats = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  };

  if (!editor || !selection || selection.rangeCount === 0) {
    return inactive;
  }

  const anchorNode = selection.anchorNode;
  if (!anchorNode || !editor.contains(anchorNode)) {
    return inactive;
  }

  let node: Node | null =
    anchorNode.nodeType === Node.TEXT_NODE
      ? anchorNode.parentElement
      : anchorNode;

  while (node && node !== editor) {
    if (node instanceof HTMLElement) {
      for (const formatKey of Object.keys(inactive) as FormatKey[]) {
        if (!inactive[formatKey] && elementHasFormat(node, formatKey)) {
          inactive[formatKey] = true;
        }
      }
    }
    node = node.parentElement;
  }

  return inactive;
}

function clampFontSize(size: number) {
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
}

function isStyleOnlySpan(element: HTMLSpanElement): boolean {
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

function getWriteTextStyleAtRange(
  editor: HTMLElement,
  range: Range
): TextStyleState {
  let node: Node | null = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  let color: string | null = null;
  let fontSize: number | null = null;

  while (node && node !== editor) {
    if (node instanceof HTMLElement) {
      if (!color && node.style.color) {
        color = normalizeBbcodeColor(node.style.color);
      }
      if (!fontSize && node.style.fontSize) {
        fontSize = normalizeBbcodeFontSize(
          Number.parseInt(node.style.fontSize, 10)
        );
      }
    }
    node = node.parentNode;
  }

  return { color, fontSize };
}

function findStyleOnlySpanAncestor(
  node: Node,
  editor: HTMLElement
): HTMLSpanElement | null {
  let current: Node | null =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (current && current !== editor) {
    if (current instanceof HTMLSpanElement && isStyleOnlySpan(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function getBbcodeTextStyleAtPosition(
  value: string,
  position: number
): TextStyleState {
  const colorBounds = findEnclosingBbcodeTagBounds(value, position, "color");
  const sizeBounds = findEnclosingBbcodeTagBounds(value, position, "size");

  let color: string | null = null;
  let fontSize: number | null = null;

  if (colorBounds) {
    const openTag = value.slice(colorBounds.openStart, colorBounds.openEnd);
    const match = openTag.match(/\[color=([^\]]+)\]/i);
    color = match ? normalizeBbcodeColor(match[1]) : null;
  }

  if (sizeBounds) {
    const openTag = value.slice(sizeBounds.openStart, sizeBounds.openEnd);
    const match = openTag.match(/\[size=([^\]]+)\]/i);
    fontSize = match ? normalizeBbcodeFontSize(match[1]) : null;
  }

  return { color, fontSize };
}

function buildBbcodeStyledMarkup(
  inner: string,
  color: string | null,
  fontSize: number | null
): string {
  let result = inner;
  if (fontSize) {
    result = `[size=${fontSize}]${result}[/size]`;
  }
  if (color) {
    result = `[color=${color}]${result}[/color]`;
  }
  return result;
}

function getBbcodeStyledInsertCursor(markup: string): number {
  const sizeClose = markup.indexOf("[/size]");
  if (sizeClose !== -1) {
    return sizeClose;
  }

  const colorClose = markup.indexOf("[/color]");
  if (colorClose !== -1) {
    return colorClose;
  }

  return markup.length;
}

function buildWriteStyleText(color: string | null, fontSize: number | null) {
  const parts: string[] = [];
  if (color) {
    parts.push(`color: ${color}`);
  }
  if (fontSize) {
    parts.push(`font-size: ${fontSize}px`);
  }
  return parts.join("; ");
}

function getSpanTextWithoutPlaceholder(span: HTMLSpanElement): string {
  return span.textContent?.replace(/\u200B/g, "") ?? "";
}

function isTypingOnlySpan(span: HTMLSpanElement): boolean {
  return getSpanTextWithoutPlaceholder(span).length === 0;
}

function placeCaretInTypingSpan(
  typingSpan: HTMLSpanElement,
  selection: Selection
) {
  preserveWindowScroll(() => {
    const caretRange = document.createRange();
    caretRange.selectNodeContents(typingSpan);
    caretRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(caretRange);
  });
}

function splitStyleSpanAtCursor(
  span: HTMLSpanElement,
  range: Range
): { rightSpan: HTMLSpanElement | null } {
  const splitRange = document.createRange();
  splitRange.selectNodeContents(span);
  splitRange.setStart(range.startContainer, range.startOffset);

  const rightFragment = splitRange.extractContents();
  const rightText = rightFragment.textContent?.replace(/\u200B/g, "") ?? "";

  if (!rightText.length) {
    return { rightSpan: null };
  }

  const rightSpan = document.createElement("span");
  rightSpan.style.cssText = span.style.cssText;
  rightSpan.appendChild(rightFragment);
  return { rightSpan };
}

function applyWriteStyleForTyping(
  editor: HTMLElement,
  range: Range,
  selection: Selection,
  color: string | null,
  fontSize: number
) {
  preserveWindowScroll(() => {
    if (!range.collapsed) {
      range.collapse(false);
    }

    const styleOnlySpan = findStyleOnlySpanAncestor(range.startContainer, editor);

    if (styleOnlySpan && isTypingOnlySpan(styleOnlySpan)) {
      if (color) {
        styleOnlySpan.style.color = color;
      } else {
        styleOnlySpan.style.removeProperty("color");
      }
      styleOnlySpan.style.fontSize = `${fontSize}px`;
      placeCaretInTypingSpan(styleOnlySpan, selection);
      return;
    }

    const typingSpan = document.createElement("span");
    typingSpan.style.cssText = buildWriteStyleText(color, fontSize);
    typingSpan.appendChild(document.createTextNode("\u200B"));

    if (styleOnlySpan?.parentNode) {
      const parent = styleOnlySpan.parentNode;
      const { rightSpan } = splitStyleSpanAtCursor(styleOnlySpan, range);
      const leftHasText = getSpanTextWithoutPlaceholder(styleOnlySpan).length > 0;

      if (!leftHasText) {
        parent.insertBefore(typingSpan, styleOnlySpan);
        parent.removeChild(styleOnlySpan);
        if (rightSpan) {
          parent.insertBefore(rightSpan, typingSpan.nextSibling);
        }
      } else {
        parent.insertBefore(typingSpan, styleOnlySpan.nextSibling);
        if (rightSpan) {
          parent.insertBefore(rightSpan, typingSpan.nextSibling);
        }
      }
    } else {
      range.insertNode(typingSpan);
    }

    placeCaretInTypingSpan(typingSpan, selection);
  });
}

function isStyleSpanEmpty(span: HTMLSpanElement): boolean {
  return !span.style.color && !span.style.fontSize;
}

function stripStylePropertyFromHolder(
  holder: HTMLElement,
  property: "color" | "fontSize"
) {
  const propertyName = property === "color" ? "color" : "font-size";
  const spans = Array.from(holder.querySelectorAll("span")).reverse();

  for (const span of spans) {
    if (!(span instanceof HTMLSpanElement) || !isStyleOnlySpan(span)) {
      continue;
    }

    span.style.removeProperty(propertyName);

    if (isStyleSpanEmpty(span)) {
      const parent = span.parentNode;
      if (!parent) {
        continue;
      }

      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
    }
  }
}

function removeTypingOnlySpansFromHolder(holder: HTMLElement) {
  for (const span of Array.from(holder.querySelectorAll("span"))) {
    if (
      span instanceof HTMLSpanElement &&
      isStyleOnlySpan(span) &&
      isTypingOnlySpan(span)
    ) {
      span.remove();
    }
  }
}

function applyWriteStyleForSelection(
  range: Range,
  selection: Selection,
  updates: Partial<{ color: string; fontSize: number }>
) {
  preserveWindowScroll(() => {
    const span = applyWriteRunToRange(range, {
      ...(updates.color !== undefined ? { color: updates.color } : {}),
      ...(updates.fontSize !== undefined ? { fontSize: updates.fontSize } : {}),
    });

    if (!span) {
      return;
    }

    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  });
}

function stripBbcodeStyleTag(text: string, tag: "color" | "size"): string {
  const openPattern = tag === "color" ? "\\[color=[^\\]]+\\]" : "\\[size=[^\\]]+\\]";
  const closePattern = tag === "color" ? "\\[/color\\]" : "\\[/size\\]";
  const regex = new RegExp(`${openPattern}([\\s\\S]*?)${closePattern}`, "gi");

  let result = text;
  let changed = true;

  while (changed) {
    changed = false;
    const next = result.replace(regex, "$1");
    if (next !== result) {
      result = next;
      changed = true;
    }
  }

  return result;
}

function applyBbcodeStyleForSelection(
  value: string,
  start: number,
  end: number,
  updates: Partial<{ color: string; fontSize: number }>
): { nextValue: string; selectionStart: number; selectionEnd: number } {
  let selected = value.slice(start, end);

  if (updates.color) {
    selected = stripBbcodeStyleTag(selected, "color");
  }
  if (updates.fontSize) {
    selected = stripBbcodeStyleTag(selected, "size");
  }

  let wrapped = selected;
  if (updates.fontSize) {
    wrapped = `[size=${updates.fontSize}]${wrapped}[/size]`;
  }
  if (updates.color) {
    wrapped = `[color=${updates.color}]${wrapped}[/color]`;
  }

  const nextValue = `${value.slice(0, start)}${wrapped}${value.slice(end)}`;

  return {
    nextValue,
    selectionStart: start,
    selectionEnd: start + wrapped.length,
  };
}

function splitBbcodeTagAtCursor(
  value: string,
  position: number,
  tag: "size" | "color"
) {
  const bounds = findEnclosingBbcodeTagBounds(value, position, tag);
  if (!bounds) {
    return null;
  }

  const openTag = value.slice(bounds.openStart, bounds.openEnd);
  const inner = value.slice(bounds.openEnd, bounds.closeStart);
  const offset = position - bounds.openEnd;

  return {
    before: inner.slice(0, offset),
    after: inner.slice(offset),
    bounds,
    openTag,
  };
}

function applyBbcodeFontSizeForTyping(
  value: string,
  start: number,
  end: number,
  fontSize: number
) {
  const position = start !== end ? end : start;
  const contextStyles = getBbcodeTextStyleAtPosition(value, position);
  const typingMarkup = buildBbcodeStyledMarkup("", contextStyles.color, fontSize);
  const typingCursorOffset = getBbcodeStyledInsertCursor(typingMarkup);

  const sizeSplit = splitBbcodeTagAtCursor(value, position, "size");
  if (sizeSplit) {
    const oldSizeMatch = sizeSplit.openTag.match(/\[size=([^\]]+)\]/i);
    const oldSize = oldSizeMatch?.[1];
    const parts: string[] = [];

    if (sizeSplit.before && oldSize) {
      parts.push(`[size=${oldSize}]${sizeSplit.before}[/size]`);
    }
    parts.push(typingMarkup);
    if (sizeSplit.after && oldSize) {
      parts.push(`[size=${oldSize}]${sizeSplit.after}[/size]`);
    }

    const middle = parts.join("");
    const nextValue = `${value.slice(0, sizeSplit.bounds.openStart)}${middle}${value.slice(sizeSplit.bounds.closeEnd)}`;
    const leftLength =
      sizeSplit.before && oldSize
        ? `[size=${oldSize}]${sizeSplit.before}[/size]`.length
        : 0;
    const cursor = sizeSplit.bounds.openStart + leftLength + typingCursorOffset;
    return { nextValue, cursor };
  }

  const colorSplit = splitBbcodeTagAtCursor(value, position, "color");
  if (colorSplit) {
    const colorMatch = colorSplit.openTag.match(/\[color=([^\]]+)\]/i);
    const colorValue = colorMatch?.[1];
    const parts: string[] = [];

    if (colorSplit.before && colorValue) {
      parts.push(`[color=${colorValue}]${colorSplit.before}[/color]`);
    }
    parts.push(typingMarkup);
    if (colorSplit.after && colorValue) {
      parts.push(`[color=${colorValue}]${colorSplit.after}[/color]`);
    }

    const middle = parts.join("");
    const nextValue = `${value.slice(0, colorSplit.bounds.openStart)}${middle}${value.slice(colorSplit.bounds.closeEnd)}`;
    const leftLength =
      colorSplit.before && colorValue
        ? `[color=${colorValue}]${colorSplit.before}[/color]`.length
        : 0;
    const cursor = colorSplit.bounds.openStart + leftLength + typingCursorOffset;
    return { nextValue, cursor };
  }

  const nextValue = `${value.slice(0, position)}${typingMarkup}${value.slice(position)}`;
  const cursor = position + typingCursorOffset;
  return { nextValue, cursor };
}

function applyBbcodeColorForTyping(
  value: string,
  start: number,
  end: number,
  color: string
) {
  const position = start !== end ? end : start;
  const contextStyles = getBbcodeTextStyleAtPosition(value, position);
  const fontSize = contextStyles.fontSize ?? DEFAULT_FONT_SIZE;
  const typingMarkup = buildBbcodeStyledMarkup("", color, fontSize);
  const typingCursorOffset = getBbcodeStyledInsertCursor(typingMarkup);

  const colorSplit = splitBbcodeTagAtCursor(value, position, "color");
  if (colorSplit) {
    const colorMatch = colorSplit.openTag.match(/\[color=([^\]]+)\]/i);
    const oldColor = colorMatch?.[1];
    const parts: string[] = [];

    if (colorSplit.before && oldColor) {
      parts.push(`[color=${oldColor}]${colorSplit.before}[/color]`);
    }
    parts.push(typingMarkup);
    if (colorSplit.after && oldColor) {
      parts.push(`[color=${oldColor}]${colorSplit.after}[/color]`);
    }

    const middle = parts.join("");
    const nextValue = `${value.slice(0, colorSplit.bounds.openStart)}${middle}${value.slice(colorSplit.bounds.closeEnd)}`;
    const leftLength =
      colorSplit.before && oldColor
        ? `[color=${oldColor}]${colorSplit.before}[/color]`.length
        : 0;
    const cursor = colorSplit.bounds.openStart + leftLength + typingCursorOffset;
    return { nextValue, cursor };
  }

  const sizeSplit = splitBbcodeTagAtCursor(value, position, "size");
  if (sizeSplit) {
    const oldSizeMatch = sizeSplit.openTag.match(/\[size=([^\]]+)\]/i);
    const oldSize = oldSizeMatch?.[1];
    const parts: string[] = [];

    if (sizeSplit.before && oldSize) {
      parts.push(`[size=${oldSize}]${sizeSplit.before}[/size]`);
    }
    parts.push(typingMarkup);
    if (sizeSplit.after && oldSize) {
      parts.push(`[size=${oldSize}]${sizeSplit.after}[/size]`);
    }

    const middle = parts.join("");
    const nextValue = `${value.slice(0, sizeSplit.bounds.openStart)}${middle}${value.slice(sizeSplit.bounds.closeEnd)}`;
    const leftLength =
      sizeSplit.before && oldSize
        ? `[size=${oldSize}]${sizeSplit.before}[/size]`.length
        : 0;
    const cursor = sizeSplit.bounds.openStart + leftLength + typingCursorOffset;
    return { nextValue, cursor };
  }

  const nextValue = `${value.slice(0, position)}${typingMarkup}${value.slice(position)}`;
  const cursor = position + typingCursorOffset;
  return { nextValue, cursor };
}

function turnOffBbcodeFormat(
  value: string,
  start: number,
  end: number,
  tag: string
): { nextValue: string; selectionStart: number; selectionEnd: number } | null {
  const bounds = findEnclosingBbcodeTagBounds(value, start, tag);
  if (!bounds) {
    return null;
  }

  const { openStart, openEnd, closeStart, closeEnd } = bounds;
  const open = `[${tag}]`;
  const close = `[/${tag}]`;

  if (start < openEnd || end > closeStart) {
    return null;
  }

  if (start === end) {
    const position = start;
    const prefix = value.slice(openEnd, position);
    const suffix = value.slice(position, closeStart);

    if (prefix.length === 0) {
      return {
        nextValue: value,
        selectionStart: closeEnd,
        selectionEnd: closeEnd,
      };
    }

    if (suffix.length === 0) {
      const replacement = `${open}${prefix}${close}`;
      const nextValue = `${value.slice(0, openStart)}${replacement}${value.slice(closeEnd)}`;
      const cursor = openStart + replacement.length;
      return { nextValue, selectionStart: cursor, selectionEnd: cursor };
    }

    const replacement = `${open}${prefix}${close}${suffix}`;
    const nextValue = `${value.slice(0, openStart)}${replacement}${value.slice(closeEnd)}`;
    const cursor = openStart + open.length + prefix.length + close.length;
    return { nextValue, selectionStart: cursor, selectionEnd: cursor };
  }

  const before = value.slice(openEnd, start);
  const selected = value.slice(start, end);
  const after = value.slice(end, closeStart);
  const parts: string[] = [];

  if (before) {
    parts.push(`${open}${before}${close}`);
  }
  parts.push(selected);
  if (after) {
    parts.push(`${open}${after}${close}`);
  }

  const replacement = parts.join("");
  const nextValue = `${value.slice(0, openStart)}${replacement}${value.slice(closeEnd)}`;
  const plainStart =
    openStart + (before ? open.length + before.length + close.length : 0);

  return {
    nextValue,
    selectionStart: plainStart,
    selectionEnd: plainStart + selected.length,
  };
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string) {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

export function BBCodeEditor({
  value,
  onChange,
  id,
  rows = 6,
  placeholder,
  required,
  minLength,
  className,
}: BBCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const writeEditorRef = useRef<HTMLDivElement>(null);
  const writeEditorWrapperRef = useRef<HTMLDivElement>(null);
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const savedWriteCaretRef = useRef<Range | null>(null);
  const savedBbcodeSelectionRef = useRef<{
    start: number;
    end: number;
  } | null>(null);
  const toolbarScrollLockRef = useRef<number | null>(null);
  const lastSyncedValue = useRef<string | null>(null);
  const writeEditorHydratedRef = useRef(false);
  const skipExternalSync = useRef(false);
  const formatOverridesRef = useRef<Partial<Record<FormatKey, boolean>>>({});
  const lastFormatSelectionKeyRef = useRef("");

  const [mode, setMode] = useState<EditorMode>("write");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkContext, setLinkContext] = useState<LinkContext | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [selectedImageOverlay, setSelectedImageOverlay] =
    useState<SelectedImageOverlay | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [alignMenuOpen, setAlignMenuOpen] = useState(false);
  const [writeMentionSuggestions, setWriteMentionSuggestions] = useState<
    MentionUser[]
  >([]);
  const [writeShowMentionSuggestions, setWriteShowMentionSuggestions] =
    useState(false);
  const [writeMentionActiveIndex, setWriteMentionActiveIndex] = useState(0);
  const [writeMentionStart, setWriteMentionStart] = useState<number | null>(
    null
  );
  const [writeMentionQuery, setWriteMentionQuery] = useState("");
  const [writeMentionPopupPosition, setWriteMentionPopupPosition] =
    useState<MentionPopupPosition | null>(null);
  const [customColor, setCustomColor] = useState(DEFAULT_TEXT_COLOR);
  const [textColorControl, setTextColorControl] = useState(DEFAULT_TEXT_COLOR);
  const [fontSizeControl, setFontSizeControl] = useState(DEFAULT_FONT_SIZE);
  const [fontSizeInput, setFontSizeInput] = useState(String(DEFAULT_FONT_SIZE));
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const alignButtonRef = useRef<HTMLButtonElement>(null);
  const alignMenuRef = useRef<HTMLDivElement>(null);
  const imageUrlInputRef = useRef<HTMLInputElement>(null);
  const linkUrlInputRef = useRef<HTMLInputElement>(null);

  const colorMenuPosition = useAnchoredFixedPosition({
    anchorRef: colorButtonRef,
    enabled: colorMenuOpen,
    matchWidth: false,
    maxHeight: 320,
  });

  const alignMenuPosition = useAnchoredFixedPosition({
    anchorRef: alignButtonRef,
    enabled: alignMenuOpen,
    matchWidth: false,
    maxHeight: 220,
  });

  useDismissOnOutside(
    colorMenuOpen,
    () => setColorMenuOpen(false),
    colorButtonRef,
    colorMenuRef
  );

  useDismissOnOutside(
    alignMenuOpen,
    () => setAlignMenuOpen(false),
    alignButtonRef,
    alignMenuRef
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (mode !== "write") {
      setWriteShowMentionSuggestions(false);
      setWriteMentionSuggestions([]);
      setWriteMentionQuery("");
      setWriteMentionStart(null);
      setWriteMentionPopupPosition(null);
      return;
    }

    if (writeMentionQuery.length < 1) {
      setWriteMentionSuggestions([]);
      setWriteShowMentionSuggestions(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      const results = await searchMentionUsers(writeMentionQuery);
      setWriteMentionSuggestions(results);
      setWriteShowMentionSuggestions(results.length > 0);
      setWriteMentionActiveIndex(0);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [mode, writeMentionQuery]);

  useEffect(() => {
    if (!writeShowMentionSuggestions || writeMentionSuggestions.length === 0) {
      setWriteMentionPopupPosition(null);
      return;
    }

    updateWriteMentionPopupPosition();
  }, [
    writeShowMentionSuggestions,
    writeMentionSuggestions,
    value,
    mode,
  ]);

  useEffect(() => {
    if (!writeShowMentionSuggestions) {
      return;
    }

    const editor = writeEditorRef.current;

    function handleReposition() {
      updateWriteMentionPopupPosition();
    }

    editor?.addEventListener("scroll", handleReposition);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    window.visualViewport?.addEventListener("resize", handleReposition);
    window.visualViewport?.addEventListener("scroll", handleReposition);

    return () => {
      editor?.removeEventListener("scroll", handleReposition);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      window.visualViewport?.removeEventListener("resize", handleReposition);
      window.visualViewport?.removeEventListener("scroll", handleReposition);
    };
  }, [writeShowMentionSuggestions]);

  useEffect(() => {
    if (!imageModalOpen) {
      return;
    }

    requestAnimationFrame(() => {
      imageUrlInputRef.current?.focus({ preventScroll: true });
      restoreLockedToolbarScroll();
    });
  }, [imageModalOpen]);

  useEffect(() => {
    if (!linkModalOpen) {
      return;
    }

    requestAnimationFrame(() => {
      linkUrlInputRef.current?.focus({ preventScroll: true });
      restoreLockedToolbarScroll();
    });
  }, [linkModalOpen]);

  useEffect(() => {
    if (!selectedImageOverlay) {
      return;
    }

    function refreshOverlay() {
      updateSelectedImageOverlay();
    }

    window.addEventListener("resize", refreshOverlay);
    window.addEventListener("scroll", refreshOverlay, true);

    return () => {
      window.removeEventListener("resize", refreshOverlay);
      window.removeEventListener("scroll", refreshOverlay, true);
    };
  }, [selectedImageOverlay]);

  function resolveActiveFormats(
    detected: ActiveFormats,
    selectionKey: string
  ): ActiveFormats {
    if (selectionKey && selectionKey !== lastFormatSelectionKeyRef.current) {
      lastFormatSelectionKeyRef.current = selectionKey;
      formatOverridesRef.current = {};
    }

    const overrides = formatOverridesRef.current;
    const resolve = (key: FormatKey) =>
      key in overrides ? overrides[key]! : detected[key];

    return {
      bold: resolve("bold"),
      italic: resolve("italic"),
      underline: resolve("underline"),
      strikethrough: resolve("strikethrough"),
    };
  }

  function getShownFormatState(
    detected: ActiveFormats,
    formatKey: FormatKey
  ): boolean {
    const overrides = formatOverridesRef.current;
    return formatKey in overrides ? overrides[formatKey]! : detected[formatKey];
  }

  function applyFormatOverride(
    formatKey: FormatKey,
    isActive: boolean,
    selectionKey: string
  ) {
    lastFormatSelectionKeyRef.current = selectionKey;
    formatOverridesRef.current[formatKey] = isActive;
    setActiveFormats((current) => ({
      ...current,
      [formatKey]: isActive,
    }));
  }

  const syncStyleControlsFromSelection = useCallback(() => {
    if (mode === "bbcode") {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const { color, fontSize } = getBbcodeTextStyleAtPosition(
        value,
        textarea.selectionStart
      );
      const nextColor = color ?? DEFAULT_TEXT_COLOR;
      setTextColorControl((current) => (current === nextColor ? current : nextColor));
      setCustomColor((current) => (current === nextColor ? current : nextColor));
      const nextFontSize = fontSize ?? DEFAULT_FONT_SIZE;
      const nextFontSizeLabel = String(nextFontSize);
      setFontSizeControl((current) =>
        current === nextFontSize ? current : nextFontSize
      );
      setFontSizeInput((current) =>
        current === nextFontSizeLabel ? current : nextFontSizeLabel
      );
      return;
    }

    const editor = writeEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    const { color, fontSize } = getWriteTextStyleAtRange(editor, range);
    const nextColor = color ?? DEFAULT_TEXT_COLOR;
    setTextColorControl((current) => (current === nextColor ? current : nextColor));
    setCustomColor((current) => (current === nextColor ? current : nextColor));
    const nextFontSize = fontSize ?? DEFAULT_FONT_SIZE;
    const nextFontSizeLabel = String(nextFontSize);
    setFontSizeControl((current) =>
      current === nextFontSize ? current : nextFontSize
    );
    setFontSizeInput((current) =>
      current === nextFontSizeLabel ? current : nextFontSizeLabel
    );
  }, [mode, value]);

  const updateWriteFormatState = useCallback(() => {
    const editor = writeEditorRef.current;
    const selection = window.getSelection();
    const detected = getWriteFormatStateFromEditor(editor, selection);
    const selectionKey = getWriteSelectionKey(editor, selection);
    setActiveFormats(resolveActiveFormats(detected, selectionKey));
    syncStyleControlsFromSelection();
  }, [syncStyleControlsFromSelection]);

  function updateBbcodeFormatState() {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const detected = getBbcodeFormatState(
      value,
      textarea.selectionStart
    );
    const selectionKey = getBbcodeSelectionKey(
      textarea.selectionStart,
      textarea.selectionEnd
    );
    setActiveFormats(resolveActiveFormats(detected, selectionKey));
    syncStyleControlsFromSelection();
  }

  useEffect(() => {
    if (mode !== "write") {
      return;
    }

    function handleSelectionChange() {
      const selection = window.getSelection();
      const editor = writeEditorRef.current;
      if (!selection || !editor || selection.rangeCount === 0) {
        return;
      }

      const anchorNode = selection.anchorNode;
      if (!anchorNode || !editor.contains(anchorNode)) {
        return;
      }

      updateWriteFormatState();
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [mode, updateWriteFormatState]);

  useEffect(() => {
    if (mode === "bbcode") {
      lastSyncedValue.current = value;
    }
  }, [mode, value]);

  useEffect(() => {
    requestAnimationFrame(() => {
      syncStyleControlsFromSelection();
    });
  }, [mode, syncStyleControlsFromSelection]);

  useEffect(() => {
    if (mode !== "bbcode") {
      return;
    }

    requestAnimationFrame(() => {
      syncStyleControlsFromSelection();
    });
  }, [mode, value, syncStyleControlsFromSelection]);

  useEffect(() => {
    if (mode !== "write") {
      writeEditorHydratedRef.current = false;
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "write" || !writeEditorRef.current) {
      return;
    }

    if (!value.trim()) {
      writeEditorRef.current.innerHTML = "";
      lastSyncedValue.current = "";
      writeEditorHydratedRef.current = false;
      skipExternalSync.current = false;
      formatOverridesRef.current = {};
      lastFormatSelectionKeyRef.current = "";
      clearSelectedWriteImage();
      setActiveFormats({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
      });
      syncWriteEditorHeight();
      return;
    }

    if (skipExternalSync.current) {
      skipExternalSync.current = false;
      return;
    }

    if (
      writeEditorHydratedRef.current &&
      value === lastSyncedValue.current
    ) {
      return;
    }

    writeEditorRef.current.innerHTML = bbcodeHtmlForWriteEditor(value);
    lastSyncedValue.current = value;
    writeEditorHydratedRef.current = true;
    syncWriteEditorHeight();
  }, [value, mode]);

  function emitChange(nextValue: string) {
    skipExternalSync.current = true;
    lastSyncedValue.current = nextValue;
    onChange({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as React.ChangeEvent<HTMLTextAreaElement>);
  }

  function emitChangeWithSelection(
    nextValue: string,
    selectionStart: number,
    selectionEnd: number
  ) {
    emitChange(nextValue);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      textarea?.focus({ preventScroll: true });
      textarea?.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function focusWriteEditor() {
    const editor = writeEditorRef.current;
    if (!editor) {
      return;
    }

    if (document.activeElement === editor || editor.contains(document.activeElement)) {
      return;
    }

    editor.focus({ preventScroll: true });
  }

  const writeMinHeightPx = Math.max(rows * 1.5, 6) * 16;

  function lockToolbarScroll() {
    toolbarScrollLockRef.current = window.scrollY;
  }

  function restoreLockedToolbarScroll(scrollCompensation = 0) {
    if (toolbarScrollLockRef.current === null) {
      return;
    }

    const scrollY = toolbarScrollLockRef.current + scrollCompensation;
    restoreScrollPosition(window.scrollX, scrollY);
    window.setTimeout(() => restoreScrollPosition(window.scrollX, scrollY), 0);
    window.setTimeout(() => restoreScrollPosition(window.scrollX, scrollY), 50);
    window.setTimeout(() => restoreScrollPosition(window.scrollX, scrollY), 100);
  }

  function syncWriteEditorHeight() {
    const editor = writeEditorRef.current;
    if (!editor) {
      return;
    }

    const heightBefore = editor.style.height;
    if (!heightBefore) {
      return;
    }

    editor.style.removeProperty("height");
  }

  function updateWriteMentionPopupPosition() {
    const editor = writeEditorRef.current;
    if (!editor) {
      return;
    }

    const cursor = getContentEditableCaretOffset(editor);
    if (cursor === null) {
      return;
    }

    const rect = getTextOffsetCaretRect(editor, cursor);
    if (!rect) {
      return;
    }

    setWriteMentionPopupPosition({
      top: rect.bottom + MENTION_POPUP_OFFSET_Y,
      left: rect.left + MENTION_POPUP_OFFSET_X,
    });
  }

  function updateWriteMentionState() {
    const editor = writeEditorRef.current;
    if (!editor) {
      return;
    }

    const text = getContentEditablePlainText(editor);
    const cursor = getContentEditableCaretOffset(editor);
    if (cursor === null) {
      return;
    }

    const activeMention = getActiveMentionAtCursor(text, cursor);

    if (!activeMention) {
      setWriteMentionStart(null);
      setWriteMentionQuery("");
      setWriteShowMentionSuggestions(false);
      return;
    }

    setWriteMentionStart(activeMention.start);
    setWriteMentionQuery(activeMention.query);
  }

  function insertWriteMention(username: string) {
    const editor = writeEditorRef.current;
    if (!editor || writeMentionStart === null) {
      return;
    }

    const cursor = getContentEditableCaretOffset(editor);
    if (cursor === null) {
      return;
    }

    replaceTextRangeInContentEditable(
      editor,
      writeMentionStart,
      cursor,
      `@${username} `
    );

    setWriteMentionStart(null);
    setWriteMentionQuery("");
    setWriteMentionSuggestions([]);
    setWriteShowMentionSuggestions(false);
    setWriteMentionPopupPosition(null);
    syncValueFromWrite();
    editor.focus();
  }

  function handleWriteEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (writeShowMentionSuggestions && writeMentionSuggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setWriteMentionActiveIndex((current) =>
          current + 1 >= writeMentionSuggestions.length ? 0 : current + 1
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setWriteMentionActiveIndex((current) =>
          current - 1 < 0
            ? writeMentionSuggestions.length - 1
            : current - 1
        );
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertWriteMention(
          writeMentionSuggestions[writeMentionActiveIndex].username
        );
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setWriteShowMentionSuggestions(false);
        return;
      }
    }
  }

  function syncValueFromWrite() {
    const editor = writeEditorRef.current;
    const savedOffsets = editor ? getWriteSelectionOffsets(editor) : null;
    const didNormalize = Boolean(editor && editorNeedsNormalize(editor));

    if (editor && didNormalize) {
      normalizeWriteEditorHtml(editor);
    }

    const html = editor?.innerHTML ?? "";
    const bbcode = htmlToBbcode(html);
    emitChange(bbcode);

    if (editor && savedOffsets && didNormalize) {
      restoreWriteSelectionOffsets(
        editor,
        savedOffsets.start,
        savedOffsets.end
      );
    }

    syncWriteEditorHeight();
    updateSelectedImageOverlay();
    updateWriteMentionState();
  }

  function updateSelectedImageOverlay() {
    const image = selectedImageRef.current;
    const wrapper = writeEditorWrapperRef.current;

    if (!image || !wrapper || !writeEditorRef.current?.contains(image)) {
      setSelectedImageOverlay(null);
      return;
    }

    const imageRect = image.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    setSelectedImageOverlay({
      top: imageRect.top - wrapperRect.top,
      left: imageRect.left - wrapperRect.left,
      width: imageRect.width,
      height: imageRect.height,
    });
  }

  function clearSelectedWriteImage() {
    selectedImageRef.current?.classList.remove("bbcode-img-selected");
    selectedImageRef.current = null;
    setSelectedImageOverlay(null);
  }

  function selectWriteImage(image: HTMLImageElement) {
    clearSelectedWriteImage();
    selectedImageRef.current = image;
    image.classList.add("bbcode-img-selected");
    updateSelectedImageOverlay();
  }

  function handleWriteEditorClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (
      target instanceof HTMLImageElement &&
      target.classList.contains("bbcode-img")
    ) {
      selectWriteImage(target);
      return;
    }

    clearSelectedWriteImage();
  }

  function handleImageResizeStart(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const image = selectedImageRef.current;
    if (!image) {
      return;
    }

    const resizeTarget: HTMLImageElement = image;
    const startX = event.clientX;
    const startWidth = resizeTarget.getBoundingClientRect().width;

    function handleMouseMove(moveEvent: MouseEvent) {
      const nextWidth = Math.max(
        MIN_IMAGE_WIDTH,
        Math.min(MAX_IMAGE_WIDTH, startWidth + (moveEvent.clientX - startX))
      );
      resizeTarget.style.width = `${Math.round(nextWidth)}px`;
      resizeTarget.style.height = "auto";
      resizeTarget.style.maxWidth = "100%";
      updateSelectedImageOverlay();
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      syncValueFromWrite();
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function restoreSavedRange() {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  }

  function captureWriteCaret() {
    const editor = writeEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedWriteCaretRef.current = range.cloneRange();
    }
  }

  function captureBbcodeCaret() {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    savedBbcodeSelectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }

  function captureEditorCaretForFontSize() {
    lockToolbarScroll();

    if (mode === "bbcode") {
      captureBbcodeCaret();
      return;
    }

    captureWriteCaret();
  }

  function handleFontSizeInputFocus() {
    captureEditorCaretForFontSize();
    restoreLockedToolbarScroll();
  }

  function resolveWriteRangeForFontSize(): Range | null {
    const editor = writeEditorRef.current;
    if (!editor) {
      return null;
    }

    const selection = window.getSelection();
    if (selection?.rangeCount) {
      const liveRange = selection.getRangeAt(0);
      if (editor.contains(liveRange.commonAncestorContainer)) {
        return liveRange.cloneRange();
      }
    }

    if (
      savedWriteCaretRef.current &&
      editor.contains(savedWriteCaretRef.current.commonAncestorContainer)
    ) {
      return savedWriteCaretRef.current.cloneRange();
    }

    const endRange = document.createRange();
    endRange.selectNodeContents(editor);
    endRange.collapse(false);
    return endRange;
  }

  function resolveBbcodeRangeForFontSize(): { start: number; end: number } {
    const textarea = textareaRef.current;
    if (!textarea) {
      return { start: value.length, end: value.length };
    }

    if (document.activeElement === textarea) {
      return {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      };
    }

    if (savedBbcodeSelectionRef.current) {
      return {
        start: Math.min(savedBbcodeSelectionRef.current.start, value.length),
        end: Math.min(savedBbcodeSelectionRef.current.end, value.length),
      };
    }

    return { start: value.length, end: value.length };
  }

  function isFocusWithinEditorChrome(target: EventTarget | null) {
    if (!(target instanceof Node)) {
      return false;
    }

    return (
      editorRootRef.current?.contains(target) ||
      colorMenuRef.current?.contains(target) ||
      false
    );
  }

  function handleWriteEditorBlur(event: React.FocusEvent<HTMLDivElement>) {
    captureWriteCaret();
    window.setTimeout(() => setWriteShowMentionSuggestions(false), 150);

    if (isFocusWithinEditorChrome(event.relatedTarget)) {
      return;
    }

    syncValueFromWrite();
  }

  function handleWriteEditorKeyUp() {
    updateWriteFormatState();
    updateWriteMentionState();
    if (writeShowMentionSuggestions) {
      updateWriteMentionPopupPosition();
    }
  }

  function handleWriteEditorMouseUp() {
    updateWriteFormatState();
    updateWriteMentionState();
    if (writeShowMentionSuggestions) {
      updateWriteMentionPopupPosition();
    }
  }

  function handleBbcodeEditorBlur() {
    captureBbcodeCaret();
  }

  function wrapSelection(open: string, close: string, placeholderText = "") {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const inner = selected || placeholderText;
    const nextValue = `${value.slice(0, start)}${open}${inner}${close}${value.slice(end)}`;

    const cursorStart = selected
      ? start + open.length + selected.length + close.length
      : start + open.length;
    const cursorEnd = selected ? cursorStart : cursorStart + placeholderText.length;

    emitChangeWithSelection(nextValue, cursorStart, cursorEnd);
  }

  function applyFontColor(color: string) {
    const normalized = normalizeBbcodeColor(color);
    if (!normalized) {
      return;
    }

    setColorMenuOpen(false);
    setTextColorControl(normalized);
    setCustomColor(normalized);

    if (toolbarScrollLockRef.current === null) {
      lockToolbarScroll();
    }

    if (mode === "bbcode") {
      const { start, end } = resolveBbcodeRangeForFontSize();
      if (start !== end) {
        const result = applyBbcodeStyleForSelection(value, start, end, {
          color: normalized,
        });
        savedBbcodeSelectionRef.current = {
          start: result.selectionStart,
          end: result.selectionEnd,
        };
        emitChangeWithSelection(
          result.nextValue,
          result.selectionStart,
          result.selectionEnd
        );
      } else {
        const result = applyBbcodeColorForTyping(
          value,
          start,
          end,
          normalized
        );
        if (result) {
          savedBbcodeSelectionRef.current = {
            start: result.cursor,
            end: result.cursor,
          };
          emitChangeWithSelection(result.nextValue, result.cursor, result.cursor);
        }
      }
      restoreLockedToolbarScroll();
      return;
    }

    const editor = writeEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) {
      return;
    }

    const range = resolveWriteRangeForFontSize();
    if (!range) {
      return;
    }

    const savedOffsets = getWriteSelectionOffsets(editor);
    const editorHeightBefore = editor.offsetHeight;

    preserveWindowScroll(() => {
      selection.removeAllRanges();
      selection.addRange(range);

      if (!range.collapsed) {
        applyWriteStyleForSelection(range, selection, { color: normalized });
      } else {
        const { fontSize } = getWriteTextStyleAtRange(editor, range);
        const nextFontSize = fontSize ?? DEFAULT_FONT_SIZE;
        applyWriteStyleForTyping(
          editor,
          range,
          selection,
          normalized,
          nextFontSize
        );
      }
      captureWriteCaret();
    });

    syncValueFromWrite();

    if (savedOffsets) {
      restoreWriteSelectionOffsets(
        editor,
        savedOffsets.start,
        savedOffsets.end
      );
    }

    const editorHeightAfter = editor.offsetHeight;
    const heightDelta = editorHeightAfter - editorHeightBefore;
    restoreLockedToolbarScroll(heightDelta < 0 ? heightDelta : 0);
  }

  function applyFontSizeValue(size: number) {
    const next = clampFontSize(size);
    if (!normalizeBbcodeFontSize(next)) {
      return;
    }

    setFontSizeControl(next);
    setFontSizeInput(String(next));

    if (toolbarScrollLockRef.current === null) {
      lockToolbarScroll();
    }

    if (mode === "bbcode") {
      const { start, end } = resolveBbcodeRangeForFontSize();
      if (start !== end) {
        const result = applyBbcodeStyleForSelection(value, start, end, {
          fontSize: next,
        });
        savedBbcodeSelectionRef.current = {
          start: result.selectionStart,
          end: result.selectionEnd,
        };
        emitChangeWithSelection(
          result.nextValue,
          result.selectionStart,
          result.selectionEnd
        );
      } else {
        const result = applyBbcodeFontSizeForTyping(value, start, end, next);
        if (result) {
          savedBbcodeSelectionRef.current = {
            start: result.cursor,
            end: result.cursor,
          };
          emitChangeWithSelection(result.nextValue, result.cursor, result.cursor);
        }
      }
      restoreLockedToolbarScroll();
      return;
    }

    const editor = writeEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) {
      return;
    }

    const range = resolveWriteRangeForFontSize();
    if (!range) {
      return;
    }

    const savedOffsets = getWriteSelectionOffsets(editor);
    const editorHeightBefore = editor.offsetHeight;

    preserveWindowScroll(() => {
      selection.removeAllRanges();
      selection.addRange(range);

      if (!range.collapsed) {
        applyWriteStyleForSelection(range, selection, { fontSize: next });
      } else {
        const { color } = getWriteTextStyleAtRange(editor, range);
        applyWriteStyleForTyping(editor, range, selection, color, next);
      }
      captureWriteCaret();
    });

    syncValueFromWrite();

    if (savedOffsets) {
      restoreWriteSelectionOffsets(
        editor,
        savedOffsets.start,
        savedOffsets.end
      );
    }

    const editorHeightAfter = editor.offsetHeight;
    const heightDelta = editorHeightAfter - editorHeightBefore;
    restoreLockedToolbarScroll(heightDelta < 0 ? heightDelta : 0);
  }

  function commitFontSizeInput() {
    const parsed = Number.parseInt(fontSizeInput, 10);
    if (!Number.isFinite(parsed)) {
      setFontSizeInput(String(fontSizeControl));
      return;
    }

    applyFontSizeValue(parsed);
  }

  function changeFontSize(delta: number) {
    applyFontSizeValue(fontSizeControl + delta);
  }

  function toggleBbcodeFormat(tag: string, formatKey: FormatKey) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const open = `[${tag}]`;
    const close = `[/${tag}]`;
    const selected = value.slice(start, end);
    const wrappedSelection = selected.match(
      new RegExp(`^\\[${tag}(?:=[^\\]]*)?\\]([\\s\\S]*)\\[\\/${tag}\\]$`, "i")
    );
    const selectionKey = getBbcodeSelectionKey(start, end);
    const detected = getBbcodeFormatState(value, start);
    const isActive = getShownFormatState(detected, formatKey);

    if (wrappedSelection) {
      const inner = wrappedSelection[1];
      const nextValue = `${value.slice(0, start)}${inner}${value.slice(end)}`;
      emitChangeWithSelection(nextValue, start, start + inner.length);
      applyFormatOverride(
        formatKey,
        false,
        getBbcodeSelectionKey(start, start + inner.length)
      );
      return;
    }

    if (isActive) {
      const result = turnOffBbcodeFormat(value, start, end, tag);
      if (result) {
        emitChangeWithSelection(
          result.nextValue,
          result.selectionStart,
          result.selectionEnd
        );
        applyFormatOverride(
          formatKey,
          false,
          getBbcodeSelectionKey(
            result.selectionStart,
            result.selectionEnd
          )
        );
        return;
      }

      applyFormatOverride(formatKey, false, selectionKey);
      return;
    }

    wrapSelection(open, close);
    applyFormatOverride(formatKey, true, selectionKey);
  }

  function insertAtCursor(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;
    const cursor = start + text.length;
    emitChangeWithSelection(nextValue, cursor, cursor);
  }

  function insertWriteHtml(html: string) {
    focusWriteEditor();
    restoreSavedRange();
    document.execCommand("insertHTML", false, html);
    syncValueFromWrite();
  }

  function focusWriteBlockContent(selector: string, selectAll = false) {
    requestAnimationFrame(() => {
      const editor = writeEditorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection) {
        return;
      }

      const targets = editor.querySelectorAll(selector);
      const target = targets[targets.length - 1];
      if (!target) {
        return;
      }

      const range = document.createRange();
      range.selectNodeContents(target);
      if (!selectAll) {
        range.collapse(true);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  function insertWriteBlockHtml(blockHtml: string) {
    focusWriteEditor();
    restoreSavedRange();
    document.execCommand(
      "insertHTML",
      false,
      `${blockHtml}<p class="bbcode-write-exit"><br></p>`
    );
    syncValueFromWrite();
    syncWriteEditorHeight();
  }

  function insertBbcodeBlock(
    open: string,
    close: string,
    placeholder: string
  ) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const content = selected || placeholder;
    const markup = `${open}${content}${close}\n\n`;
    const nextValue = `${value.slice(0, start)}${markup}${value.slice(end)}`;

    if (selected) {
      const cursor = start + markup.length;
      emitChangeWithSelection(nextValue, cursor, cursor);
      return;
    }

    const innerStart = start + open.length;
    const innerEnd = innerStart + placeholder.length;
    emitChangeWithSelection(nextValue, innerStart, innerEnd);
  }

  function applyBbcodeAlignment(alignment: BbcodeAlignment) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const content = selected || "text";
    const open = `[${alignment}]`;
    const close = `[/${alignment}]`;
    const markup = `${open}${content}${close}`;
    const nextValue = `${value.slice(0, start)}${markup}${value.slice(end)}`;

    if (selected) {
      emitChangeWithSelection(
        nextValue,
        start + markup.length,
        start + markup.length
      );
      return;
    }

    const innerStart = start + open.length;
    const innerEnd = innerStart + content.length;
    emitChangeWithSelection(nextValue, innerStart, innerEnd);
  }

  function applyAlignment(alignment: BbcodeAlignment) {
    setAlignMenuOpen(false);
    lockToolbarScroll();

    if (mode === "bbcode") {
      applyBbcodeAlignment(alignment);
      requestAnimationFrame(() => {
        restoreLockedToolbarScroll();
        textareaRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    focusWriteEditor();
    document.execCommand(WRITE_ALIGN_COMMANDS[alignment], false);
    syncValueFromWrite();
    requestAnimationFrame(() => {
      restoreLockedToolbarScroll();
      focusWriteEditor();
    });
  }

  function handleWriteFormat(formatKey: FormatKey) {
    focusWriteEditor();

    const editor = writeEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    const detected = getWriteFormatStateFromEditor(editor, selection);
    const selectionKey = getWriteSelectionKey(editor, selection);
    const isActive = getShownFormatState(detected, formatKey);
    const savedOffsets = getWriteSelectionOffsets(editor);
    const enable = !isActive;
    const wasCollapsed = range.collapsed;

    preserveWindowScroll(() => {
      if (!wasCollapsed) {
        toggleWriteInlineFormatOnRange(range, formatKey, enable);
      } else {
        document.execCommand(WRITE_COMMANDS[formatKey], false);
        normalizeWriteEditorHtml(editor);
      }
    });

    syncValueFromWrite();

    if (savedOffsets) {
      restoreWriteSelectionOffsets(
        editor,
        savedOffsets.start,
        savedOffsets.end
      );
    }

    applyFormatOverride(formatKey, enable, selectionKey);
  }

  function openLinkModal() {
    lockToolbarScroll();

    if (mode === "bbcode") {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end).trim();

      setLinkContext({ mode: "bbcode", start, end });
      setLinkUrl("");
      setLinkTitle(selected);
      setLinkModalOpen(true);
      return;
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    } else {
      savedRangeRef.current = null;
    }

    setLinkContext({ mode: "write" });
    setLinkUrl("");
    setLinkTitle(selection?.toString().trim() ?? "");
    setLinkModalOpen(true);
  }

  function closeLinkModal() {
    setLinkModalOpen(false);
    setLinkUrl("");
    setLinkTitle("");
    setLinkContext(null);
    savedRangeRef.current = null;
    requestAnimationFrame(() => {
      restoreLockedToolbarScroll();
      focusWriteEditor();
    });
  }

  function handleLinkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    const url = linkUrl.trim();
    if (!url || !linkContext) {
      return;
    }

    const title = linkTitle.trim() || url;

    if (linkContext.mode === "bbcode") {
      const markup = `[url=${url}]${title}[/url]`;
      const { start, end } = linkContext;
      const nextValue = `${value.slice(0, start)}${markup}${value.slice(end)}`;
      closeLinkModal();
      emitChangeWithSelection(nextValue, start + markup.length, start + markup.length);
      return;
    }

    const html = `<a href="${escapeAttr(url)}">${escapeHtml(title)}</a>`;
    closeLinkModal();
    insertWriteHtml(html);
  }

  function closeImageModal() {
    setImageModalOpen(false);
    setImageUrl("");
    setImageError("");
    requestAnimationFrame(() => {
      restoreLockedToolbarScroll();
      focusWriteEditor();
    });
  }

  function openImageModal() {
    lockToolbarScroll();
    if (mode === "write") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      } else {
        savedRangeRef.current = null;
      }
    }

    setImageUrl("");
    setImageError("");
    setImageModalOpen(true);
  }

  function insertImage(url: string) {
    const normalized = normalizeImageUrl(url);

    if (mode === "bbcode") {
      insertAtCursor(`[img]${normalized}[/img]`);
      return;
    }

    insertWriteHtml(
      `<img src="${escapeAttr(normalized)}" class="bbcode-img" alt="">`
    );

    requestAnimationFrame(() => {
      const editor = writeEditorRef.current;
      const images = editor?.querySelectorAll("img.bbcode-img");
      const lastImage = images?.[images.length - 1];
      if (lastImage instanceof HTMLImageElement) {
        selectWriteImage(lastImage);
      }
    });
  }

  function handleImageInsert(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    setImageError("");

    if (!isValidImageUrl(imageUrl)) {
      setImageError("Enter a valid image URL.");
      return;
    }

    insertImage(imageUrl);
    closeImageModal();
  }

  function handleQuote() {
    if (mode === "bbcode") {
      insertBbcodeBlock("[quote]", "[/quote]", "");
      return;
    }

    const selected = window.getSelection()?.toString() ?? "";
    insertWriteBlockHtml(
      `<blockquote class="bbcode-quote"><p class="bbcode-quote-label">Quote:</p><div class="bbcode-quote-body">${escapeHtml(selected) || "<br>"}</div></blockquote>`
    );
    focusWriteBlockContent(
      selected ? ".bbcode-write-exit" : ".bbcode-quote-body"
    );
  }

  function handleCode() {
    if (mode === "bbcode") {
      insertBbcodeBlock("[code]", "[/code]", "code here");
      return;
    }

    const selected = window.getSelection()?.toString() ?? "";
    const placeholder = "code here";
    const content = selected || placeholder;
    insertWriteBlockHtml(
      `<pre class="bbcode-pre"><code class="bbcode-code">${escapeHtml(content)}</code></pre>`
    );
    focusWriteBlockContent(
      selected ? ".bbcode-write-exit" : ".bbcode-code",
      !selected
    );
  }

  function handleSpoiler() {
    if (mode === "bbcode") {
      insertBbcodeBlock("[spoiler]", "[/spoiler]", "hidden text");
      return;
    }

    const selected = window.getSelection()?.toString() ?? "";
    const placeholder = "hidden text";
    const content = selected || placeholder;
    insertWriteBlockHtml(
      `<div class="bbcode-spoiler"><div class="bbcode-spoiler-content">${escapeHtml(content)}</div></div>`
    );
    focusWriteBlockContent(
      selected ? ".bbcode-write-exit" : ".bbcode-spoiler-content",
      !selected
    );
  }

  function handleList() {
    if (mode === "bbcode") {
      insertAtCursor("[list]\n[]item one\n[]item two\n[/list]");
      return;
    }

    insertWriteHtml(
      '<ul class="bbcode-list"><li class="bbcode-li">item one</li><li class="bbcode-li">item two</li></ul>'
    );
  }

  function handleModeChange(nextMode: EditorMode) {
    if (nextMode === mode) {
      return;
    }

    if (mode === "write") {
      syncValueFromWrite();
      clearSelectedWriteImage();
    }

    setColorMenuOpen(false);
    setMode(nextMode);
    formatOverridesRef.current = {};
    lastFormatSelectionKeyRef.current = "";
    setActiveFormats({
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
    });

    if (nextMode === "write") {
      const bbcode = lastSyncedValue.current ?? value;
      lastSyncedValue.current = bbcode;
      writeEditorHydratedRef.current = false;
      requestAnimationFrame(() => {
        if (writeEditorRef.current) {
          writeEditorRef.current.innerHTML = bbcodeHtmlForWriteEditor(bbcode);
          writeEditorHydratedRef.current = true;
          syncWriteEditorHeight();
        }
      });
    }
  }

  const toolbarActions: ToolbarAction[] = [
    {
      label: "B",
      title: "Bold",
      labelClassName: "font-bold",
      formatKey: "bold",
      onClick: () => {
        if (mode === "bbcode") {
          toggleBbcodeFormat("b", "bold");
          return;
        }
        handleWriteFormat("bold");
      },
    },
    {
      label: "I",
      title: "Italic",
      labelClassName: "italic",
      formatKey: "italic",
      onClick: () => {
        if (mode === "bbcode") {
          toggleBbcodeFormat("i", "italic");
          return;
        }
        handleWriteFormat("italic");
      },
    },
    {
      label: "U",
      title: "Underline",
      labelClassName: "underline",
      formatKey: "underline",
      onClick: () => {
        if (mode === "bbcode") {
          toggleBbcodeFormat("u", "underline");
          return;
        }
        handleWriteFormat("underline");
      },
    },
    {
      label: "S",
      title: "Strikethrough",
      labelClassName: "line-through",
      formatKey: "strikethrough",
      onClick: () => {
        if (mode === "bbcode") {
          toggleBbcodeFormat("s", "strikethrough");
          return;
        }
        handleWriteFormat("strikethrough");
      },
    },
    { label: "Quote", title: "Quote", onClick: handleQuote },
    { label: "Code", title: "Code", onClick: handleCode },
    { label: "Spoiler", title: "Spoiler", onClick: handleSpoiler },
    { label: "Link", title: "Link", onClick: openLinkModal },
    { label: "Image", title: "Image", onClick: openImageModal },
    { label: "List", title: "List", onClick: handleList },
  ];

  return (
    <div ref={editorRootRef} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {toolbarActions.map((action) => (
            <button
              key={action.title}
              type="button"
              title={action.title}
              onMouseDown={(event) => event.preventDefault()}
              onClick={action.onClick}
              aria-pressed={
                action.formatKey ? activeFormats[action.formatKey] : undefined
              }
              className={toolbarButtonClassName(
                action.formatKey ? activeFormats[action.formatKey] : false
              )}
            >
              <span className={action.labelClassName}>{action.label}</span>
            </button>
          ))}
          <button
            ref={colorButtonRef}
            type="button"
            title="Text color"
            aria-expanded={colorMenuOpen}
            onMouseDown={(event) => {
              event.preventDefault();
              lockToolbarScroll();
              captureEditorCaretForFontSize();
            }}
            onClick={() => {
              setAlignMenuOpen(false);
              setColorMenuOpen((open) => !open);
            }}
            className={toolbarButtonClassName(colorMenuOpen)}
          >
            <span className="font-bold" style={{ color: textColorControl }}>
              A
            </span>
          </button>
          <button
            ref={alignButtonRef}
            type="button"
            title="Text alignment"
            aria-expanded={alignMenuOpen}
            onMouseDown={(event) => {
              event.preventDefault();
              lockToolbarScroll();
              captureEditorCaretForFontSize();
            }}
            onClick={() => {
              setColorMenuOpen(false);
              setAlignMenuOpen((open) => !open);
            }}
            className={toolbarButtonClassName(alignMenuOpen)}
          >
            <span className="text-[0.7rem] font-bold leading-none">≡</span>
          </button>
          <div className="inline-flex min-h-9 items-stretch overflow-hidden rounded-lg border border-border bg-white">
            <button
              type="button"
              title="Decrease font size"
              aria-label="Decrease font size"
              disabled={fontSizeControl <= MIN_FONT_SIZE}
              onMouseDown={(event) => {
                event.preventDefault();
                captureEditorCaretForFontSize();
              }}
              onClick={() => changeFontSize(-1)}
              className="min-w-8 border-r border-border px-2 text-sm font-bold text-text-secondary transition-colors hover:bg-yellow/30 hover:text-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={fontSizeInput}
              onChange={(event) =>
                setFontSizeInput(event.target.value.replace(/\D/g, ""))
              }
              onMouseDown={captureEditorCaretForFontSize}
              onFocus={handleFontSizeInputFocus}
              onBlur={() => {
                commitFontSizeInput();
                restoreLockedToolbarScroll();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitFontSizeInput();
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  setFontSizeInput(String(fontSizeControl));
                  event.currentTarget.blur();
                }
              }}
              className="bbcode-font-size-input w-10 border-0 bg-transparent px-1 text-center text-xs font-bold tabular-nums text-text-dark"
              aria-label={`Font size, ${fontSizeControl} pixels`}
              title="Font size (8–48)"
            />
            <button
              type="button"
              title="Increase font size"
              aria-label="Increase font size"
              disabled={fontSizeControl >= MAX_FONT_SIZE}
              onMouseDown={(event) => {
                event.preventDefault();
                captureEditorCaretForFontSize();
              }}
              onClick={() => changeFontSize(1)}
              className="min-w-8 border-l border-border px-2 text-sm font-bold text-text-secondary transition-colors hover:bg-yellow/30 hover:text-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div className="inline-flex rounded-xl border border-border overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => handleModeChange("write")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold transition-colors",
              mode === "write"
                ? "bg-yellow/40 text-accent-dark"
                : "text-text-secondary hover:bg-hover"
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("bbcode")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold transition-colors",
              mode === "bbcode"
                ? "bg-yellow/40 text-accent-dark"
                : "text-text-secondary hover:bg-hover"
            )}
          >
            BBCode
          </button>
        </div>
      </div>

      {mode === "write" ? (
        <>
          <div
            ref={writeEditorWrapperRef}
            className="relative [overflow-anchor:none]"
          >
            <div
              ref={writeEditorRef}
              id={id}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              dir="ltr"
              aria-label={placeholder ?? "Write your message"}
              data-placeholder={placeholder}
              onInput={syncValueFromWrite}
              onBlur={handleWriteEditorBlur}
              onKeyDown={handleWriteEditorKeyDown}
              onKeyUp={handleWriteEditorKeyUp}
              onMouseUp={handleWriteEditorMouseUp}
              onFocus={updateWriteFormatState}
              onClick={(event) => {
                handleWriteEditorClick(event);
                updateWriteMentionState();
                if (writeShowMentionSuggestions) {
                  updateWriteMentionPopupPosition();
                }
              }}
              className={cn(
                textareaClassName,
                "bbcode-content bbcode-write-editor py-3 leading-relaxed",
                className
              )}
              style={{ minHeight: `${writeMinHeightPx}px` }}
            />
            {selectedImageOverlay ? (
              <div className="pointer-events-none absolute inset-0 z-10">
                <div
                  className="absolute rounded-xl border-2 border-accent pointer-events-none"
                  style={{
                    top: selectedImageOverlay.top,
                    left: selectedImageOverlay.left,
                    width: selectedImageOverlay.width,
                    height: selectedImageOverlay.height,
                  }}
                />
                <button
                  type="button"
                  aria-label="Resize image"
                  onMouseDown={handleImageResizeStart}
                  className="absolute h-4 w-4 rounded-sm border-2 border-white bg-accent shadow-warm pointer-events-auto cursor-se-resize"
                  style={{
                    top: selectedImageOverlay.top + selectedImageOverlay.height - 8,
                    left: selectedImageOverlay.left + selectedImageOverlay.width - 8,
                  }}
                />
              </div>
            ) : null}
            {writeShowMentionSuggestions &&
            writeMentionSuggestions.length > 0 &&
            writeMentionPopupPosition ? (
              <DropdownPortal>
                <ul
                  role="listbox"
                  style={{
                    position: "fixed",
                    top: writeMentionPopupPosition.top,
                    left: writeMentionPopupPosition.left,
                    width: MENTION_POPUP_WIDTH,
                    transform: "translateZ(0)",
                  }}
                  className={cn(dropdownPanelClassName, "rounded-lg")}
                >
                  {writeMentionSuggestions.map((suggestion, index) => (
                    <li
                      key={suggestion.id}
                      role="option"
                      aria-selected={index === writeMentionActiveIndex}
                    >
                      <button
                        type="button"
                        onMouseDown={() =>
                          insertWriteMention(suggestion.username)
                        }
                        onTouchEnd={(event) => {
                          event.preventDefault();
                          insertWriteMention(suggestion.username);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors",
                          index === writeMentionActiveIndex
                            ? "bg-hover"
                            : "hover:bg-hover"
                        )}
                      >
                        <UserAvatar
                          seed={suggestion.id}
                          avatarUrl={suggestion.avatarUrl}
                          minecraftUsername={suggestion.minecraftUsername}
                          size={28}
                        />
                        <span className="min-w-0 text-sm font-semibold text-text-dark truncate">
                          {suggestion.username}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </DropdownPortal>
            ) : null}
          </div>
          <p className="text-xs text-text-secondary">
            Click an image, then drag the corner handle to resize it.
          </p>
          {required ? (
            <textarea
              tabIndex={-1}
              aria-hidden
              value={value}
              required
              minLength={minLength}
              className="sr-only absolute h-0 w-0 overflow-hidden opacity-0 pointer-events-none"
              readOnly
              onChange={() => {}}
            />
          ) : null}
        </>
      ) : (
        <MentionTextarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          className={cn(className, "font-mono text-sm")}
          onKeyUp={updateBbcodeFormatState}
          onMouseUp={updateBbcodeFormatState}
          onSelect={updateBbcodeFormatState}
          onClick={updateBbcodeFormatState}
          onFocus={updateBbcodeFormatState}
          onBlur={handleBbcodeEditorBlur}
        />
      )}

      {portalReady && imageModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-text-dark/40 backdrop-blur-sm"
                onClick={closeImageModal}
                aria-label="Close image dialog"
              />
              <form
                onSubmit={handleImageInsert}
                onKeyDown={(event) => event.stopPropagation()}
                className="relative w-full max-w-md bg-white border border-border rounded-2xl shadow-warm-lg p-6 space-y-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bbcode-image-title"
              >
                <h2
                  id="bbcode-image-title"
                  className="text-lg font-extrabold text-text-dark"
                >
                  Insert Image
                </h2>

                <div>
                  <FieldLabel className="mb-2">Image URL</FieldLabel>
                  <input
                    ref={imageUrlInputRef}
                    type="text"
                    value={imageUrl}
                    onChange={(event) => {
                      setImageUrl(event.target.value);
                      setImageError("");
                    }}
                    placeholder="https://example.com/image.png"
                    required
                    className={formInputClassName}
                  />
                </div>

                {isValidImageUrl(imageUrl) ? (
                  <div className="rounded-xl border border-border overflow-hidden bg-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={normalizeImageUrl(imageUrl)}
                      alt="Image preview"
                      className="block max-h-48 w-full object-contain"
                    />
                  </div>
                ) : null}

                {imageError ? (
                  <p className="text-sm font-semibold text-red-700">{imageError}</p>
                ) : null}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeImageModal}
                    className="min-h-10 px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-hover"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isValidImageUrl(imageUrl)}
                    className="min-h-10 px-4 py-2 text-sm font-bold rounded-xl bg-gradient-orange text-white disabled:opacity-60"
                  >
                    Insert Image
                  </button>
                </div>
              </form>
            </div>,
            document.body
          )
        : null}

      {portalReady && linkModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-text-dark/40 backdrop-blur-sm"
                onClick={closeLinkModal}
                aria-label="Close link dialog"
              />
              <form
                onSubmit={handleLinkSubmit}
                onKeyDown={(event) => event.stopPropagation()}
                className="relative w-full max-w-md bg-white border border-border rounded-2xl shadow-warm-lg p-6 space-y-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bbcode-link-title"
              >
                <h2
                  id="bbcode-link-title"
                  className="text-lg font-extrabold text-text-dark"
                >
                  Insert Link
                </h2>

                <div>
                  <FieldLabel className="mb-2">URL</FieldLabel>
                  <input
                    ref={linkUrlInputRef}
                    type="text"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://example.com"
                    required
                    className={formInputClassName}
                  />
                </div>

                <div>
                  <FieldLabel className="mb-2">Title / Description</FieldLabel>
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(event) => setLinkTitle(event.target.value)}
                    placeholder="Link text shown to readers"
                    className={formInputClassName}
                  />
                  <p className="mt-1 text-xs text-text-secondary">
                    Leave blank to use the URL as the link text.
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeLinkModal}
                    className="min-h-10 px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-hover"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!linkUrl.trim()}
                    className="min-h-10 px-4 py-2 text-sm font-bold rounded-xl bg-gradient-orange text-white disabled:opacity-60"
                  >
                    Insert Link
                  </button>
                </div>
              </form>
            </div>,
            document.body
          )
        : null}

      {colorMenuOpen && colorMenuPosition ? (
        <DropdownPortal>
          <div
            ref={colorMenuRef}
            className={cn(dropdownPanelClassName, "rounded-xl p-3 w-52")}
            style={toDropdownPanelStyle(colorMenuPosition)}
          >
            <p className="mb-2 text-xs font-bold text-text-secondary">
              Text color
            </p>
            <div className="mb-3 grid grid-cols-4 gap-2">
              {FONT_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.label}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    captureEditorCaretForFontSize();
                    applyFontColor(preset.value);
                  }}
                  onTouchEnd={(event) => {
                    event.preventDefault();
                    captureEditorCaretForFontSize();
                    applyFontColor(preset.value);
                  }}
                  className="h-8 w-8 rounded-lg border border-border transition-transform hover:scale-105"
                  style={{ backgroundColor: preset.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onMouseDown={captureEditorCaretForFontSize}
                onChange={(event) => {
                  setCustomColor(event.target.value);
                  applyFontColor(event.target.value);
                }}
                className="h-9 w-9 cursor-pointer rounded border border-border bg-white p-0.5"
                aria-label="Custom color"
              />
              <input
                type="text"
                value={customColor}
                onMouseDown={captureEditorCaretForFontSize}
                onChange={(event) => setCustomColor(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyFontColor(customColor);
                  }
                }}
                onBlur={() => applyFontColor(customColor)}
                className={cn(formInputClassName, "flex-1 font-mono text-xs")}
                placeholder="#e29027"
                aria-label="Custom color hex"
              />
            </div>
          </div>
        </DropdownPortal>
      ) : null}

      {alignMenuOpen && alignMenuPosition ? (
        <DropdownPortal>
          <div
            ref={alignMenuRef}
            className={cn(dropdownPanelClassName, "rounded-xl p-2 w-40")}
            style={toDropdownPanelStyle(alignMenuPosition)}
          >
            <p className="px-2 py-1 text-xs font-bold text-text-secondary">
              Alignment
            </p>
            {BBCODE_ALIGNMENTS.map((alignment) => (
              <button
                key={alignment}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  captureEditorCaretForFontSize();
                  applyAlignment(alignment);
                }}
                onTouchEnd={(event) => {
                  event.preventDefault();
                  captureEditorCaretForFontSize();
                  applyAlignment(alignment);
                }}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-text-dark transition-colors hover:bg-hover"
              >
                {ALIGN_LABELS[alignment]}
              </button>
            ))}
          </div>
        </DropdownPortal>
      ) : null}

    </div>
  );
}
