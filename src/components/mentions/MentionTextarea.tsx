"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { MinecraftHead } from "@/components/forum/MinecraftHead";
import { searchMentionUsers } from "@/lib/mentions/actions";
import { getTextareaCaretOffset } from "@/lib/mentions/caretPosition";
import { getActiveMentionAtCursor } from "@/lib/mentions/parse";
import { cn } from "@/lib/utils";

type MentionUser = {
  id: string;
  username: string;
  minecraftUsername: string | null;
};

type PopupPosition = {
  top: number;
  left: number;
};

type MentionTextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const POPUP_WIDTH = 176;
const POPUP_OFFSET_X = 6;
const POPUP_OFFSET_Y = 2;

export function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  onScroll,
  className,
  ...props
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(
    null
  );

  const textValue = typeof value === "string" ? value : "";

  const updatePopupPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const caret = getTextareaCaretOffset(
      textarea,
      textarea.selectionStart ?? textValue.length
    );

    const maxLeft = Math.max(0, textarea.clientWidth - POPUP_WIDTH);
    const left = Math.min(caret.left + POPUP_OFFSET_X, maxLeft);

    setPopupPosition({
      top: caret.top + POPUP_OFFSET_Y,
      left,
    });
  }, [textValue.length]);

  useEffect(() => {
    if (mentionQuery.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      const results = await searchMentionUsers(mentionQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setActiveIndex(0);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [mentionQuery]);

  useLayoutEffect(() => {
    if (!showSuggestions || suggestions.length === 0) {
      setPopupPosition(null);
      return;
    }

    updatePopupPosition();
  }, [showSuggestions, suggestions, textValue, updatePopupPosition]);

  useEffect(() => {
    if (!showSuggestions) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    function handleReposition() {
      updatePopupPosition();
    }

    textarea.addEventListener("scroll", handleReposition);
    window.addEventListener("resize", handleReposition);

    return () => {
      textarea.removeEventListener("scroll", handleReposition);
      window.removeEventListener("resize", handleReposition);
    };
  }, [showSuggestions, updatePopupPosition]);

  function updateMentionState(text: string, cursor: number) {
    const activeMention = getActiveMentionAtCursor(text, cursor);

    if (!activeMention) {
      setMentionStart(null);
      setMentionQuery("");
      setShowSuggestions(false);
      return;
    }

    setMentionStart(activeMention.start);
    setMentionQuery(activeMention.query);
  }

  function insertMention(username: string) {
    const textarea = textareaRef.current;
    if (!textarea || mentionStart === null) {
      return;
    }

    const cursor = textarea.selectionStart;
    const before = textValue.slice(0, mentionStart);
    const after = textValue.slice(cursor);
    const mentionText = `@${username} `;
    const nextValue = `${before}${mentionText}${after}`;
    const nextCursor = before.length + mentionText.length;

    const syntheticEvent = {
      target: { value: nextValue },
      currentTarget: textarea,
    } as React.ChangeEvent<HTMLTextAreaElement>;

    onChange?.(syntheticEvent);
    setMentionStart(null);
    setMentionQuery("");
    setSuggestions([]);
    setShowSuggestions(false);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  return (
    <div className="relative">
      <AutoResizeTextarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange?.(event);
          updateMentionState(
            event.target.value,
            event.target.selectionStart ?? event.target.value.length
          );
        }}
        onClick={(event) => {
          const target = event.currentTarget;
          updateMentionState(target.value, target.selectionStart);
          if (showSuggestions) {
            updatePopupPosition();
          }
        }}
        onKeyUp={(event) => {
          const target = event.currentTarget;
          updateMentionState(target.value, target.selectionStart);
          if (showSuggestions) {
            updatePopupPosition();
          }
        }}
        onScroll={(event) => {
          onScroll?.(event);
          if (showSuggestions) {
            updatePopupPosition();
          }
        }}
        onKeyDown={(event) => {
          if (showSuggestions && suggestions.length > 0) {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) =>
                current + 1 >= suggestions.length ? 0 : current + 1
              );
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) =>
                current - 1 < 0 ? suggestions.length - 1 : current - 1
              );
              return;
            }

            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              insertMention(suggestions[activeIndex].username);
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setShowSuggestions(false);
              return;
            }
          }

          onKeyDown?.(event);
        }}
        onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
        className={className}
        {...props}
      />

      {showSuggestions && suggestions.length > 0 && popupPosition && (
        <ul
          role="listbox"
          style={{
            top: popupPosition.top,
            left: popupPosition.left,
            width: POPUP_WIDTH,
          }}
          className="absolute z-20 bg-white border border-border rounded-lg shadow-warm overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={() => insertMention(suggestion.username)}
                className={cn(
                  "flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors",
                  index === activeIndex ? "bg-hover" : "hover:bg-hover"
                )}
              >
                <MinecraftHead
                  seed={suggestion.id}
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
      )}
    </div>
  );
}
