"use client";

import { useEffect, useRef, useState } from "react";
import {
  DropdownPortal,
  dropdownPanelClassName,
  useAnchoredFixedPosition,
} from "@/components/ui/dropdown";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { sendMessage, searchMessageRecipients } from "@/lib/messages/actions";
import { BBCodeEditor } from "@/components/forum/BBCodeEditor";
import { FieldLabel } from "@/components/ui/FieldLabel";
import {
  formFieldInnerClassName,
  formFieldWrapperClassName,
  formInputClassName,
} from "@/components/ui/fieldStyles";
import { MinecraftHead } from "@/components/forum/MinecraftHead";
import { RecipientChip, type Recipient } from "@/components/messages/RecipientChip";
import { cn } from "@/lib/utils";

type ComposeMessageFormProps = {
  initialRecipients?: Recipient[];
};

export function ComposeMessageForm({
  initialRecipients = [],
}: ComposeMessageFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const recipientFieldRef = useRef<HTMLDivElement>(null);
  const [selectedRecipients, setSelectedRecipients] =
    useState<Recipient[]>(initialRecipients);
  const [searchQuery, setSearchQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Recipient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const selectedIds = new Set(selectedRecipients.map((recipient) => recipient.id));
  const suggestionPosition = useAnchoredFixedPosition({
    anchorRef: recipientFieldRef,
    enabled: showSuggestions && suggestions.length > 0,
    maxHeight: 240,
  });

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      const results = await searchMessageRecipients(query);
      const filtered = results.filter(
        (result) => !selectedIds.has(result.id)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchQuery, selectedRecipients]);

  function addRecipient(recipient: Recipient) {
    if (selectedIds.has(recipient.id)) {
      return;
    }

    setSelectedRecipients((current) => [...current, recipient]);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeRecipient(recipientId: string) {
    setSelectedRecipients((current) =>
      current.filter((recipient) => recipient.id !== recipientId)
    );
    inputRef.current?.focus();
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (
      event.key === "Backspace" &&
      searchQuery.length === 0 &&
      selectedRecipients.length > 0
    ) {
      const lastRecipient = selectedRecipients[selectedRecipients.length - 1];
      removeRecipient(lastRecipient.id);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    setShowSuggestions(false);

    const recipientUsernames = [
      ...selectedRecipients.map((recipient) => recipient.username),
      ...(searchQuery.trim() ? [searchQuery.trim()] : []),
    ];

    try {
      const result = await sendMessage(recipientUsernames, subject, content);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
      }
    } catch (submitError) {
      if (isRedirectError(submitError)) {
        throw submitError;
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to send message."
      );
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-border rounded-2xl shadow-warm p-4 md:p-6"
    >
      {error && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div className="relative">
          <FieldLabel className="mb-2">To</FieldLabel>
          <div
            ref={recipientFieldRef}
            className={cn(
              formFieldWrapperClassName,
              "flex flex-wrap items-center gap-2 px-3 py-2 min-h-[52px]"
            )}
            onClick={() => inputRef.current?.focus()}
          >
            {selectedRecipients.map((recipient) => (
              <RecipientChip
                key={recipient.id}
                recipient={recipient}
                onRemove={() => removeRecipient(recipient.id)}
              />
            ))}
            <input
              ref={inputRef}
              id="recipient"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() =>
                suggestions.length > 0 && setShowSuggestions(true)
              }
              onBlur={() =>
                window.setTimeout(() => setShowSuggestions(false), 150)
              }
              placeholder={
                selectedRecipients.length === 0
                  ? "Search by username…"
                  : "Add another recipient…"
              }
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls="recipient-suggestions"
              aria-autocomplete="list"
              className={cn(
                formFieldInnerClassName,
                "flex-1 min-w-[140px] px-2 py-2"
              )}
            />
          </div>
          {showSuggestions && suggestions.length > 0 && suggestionPosition && (
            <DropdownPortal>
              <ul
                id="recipient-suggestions"
                role="listbox"
                style={{
                  position: "fixed",
                  top: suggestionPosition.top,
                  left: suggestionPosition.left,
                  width: suggestionPosition.width,
                  maxHeight: suggestionPosition.maxHeight,
                }}
                className={cn(dropdownPanelClassName, "rounded-xl")}
              >
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id} role="option">
                    <button
                      type="button"
                      onMouseDown={() => addRecipient(suggestion)}
                      onTouchEnd={(event) => {
                        event.preventDefault();
                        addRecipient(suggestion);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover transition-colors"
                    >
                      <MinecraftHead
                        seed={suggestion.id}
                        minecraftUsername={suggestion.minecraftUsername}
                        size={36}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-dark truncate">
                          {suggestion.username}
                        </p>
                        {suggestion.minecraftUsername && (
                          <p className="text-xs text-text-secondary truncate">
                            {suggestion.minecraftUsername}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </DropdownPortal>
          )}
        </div>

        <div>
          <FieldLabel className="mb-2">Subject</FieldLabel>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            minLength={5}
            maxLength={200}
            placeholder="What is this message about?"
            className={formInputClassName}
          />
          <p className="mt-1 text-xs text-text-secondary">Minimum 5 characters.</p>
        </div>

        <div>
          <FieldLabel className="mb-2">Message</FieldLabel>
          <BBCodeEditor
            id="message"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={10}
            required
            placeholder="Write your message… Use @ to mention someone"
            className="min-h-[220px]"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-stretch md:justify-end">
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full md:w-auto min-h-11 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
            loading && "opacity-60"
          )}
        >
          {loading ? "Sending…" : "Send Message"}
        </button>
      </div>
    </form>
  );
}
