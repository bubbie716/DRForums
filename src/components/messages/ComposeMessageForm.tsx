"use client";

import { useEffect, useRef, useState } from "react";
import { sendMessage, searchMessageRecipients } from "@/lib/messages/actions";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
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
  const [selectedRecipients, setSelectedRecipients] =
    useState<Recipient[]>(initialRecipients);
  const [searchQuery, setSearchQuery] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Recipient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const selectedIds = new Set(selectedRecipients.map((recipient) => recipient.id));

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

    const result = await sendMessage(recipientUsernames, content);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-border rounded-2xl shadow-warm p-6"
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
          <label
            htmlFor="recipient"
            className="block text-sm font-bold text-text-dark mb-2"
          >
            To
          </label>
          <div
            className={cn(
              "recipient-combobox flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-cream border border-border min-h-[52px]",
              "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all"
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
              className="flex-1 min-w-[140px] px-2 py-2 bg-transparent text-text-dark placeholder:text-text-muted focus:outline-none focus-visible:outline-none"
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul
              id="recipient-suggestions"
              role="listbox"
              className="absolute z-10 mt-2 w-full bg-white border border-border rounded-xl shadow-warm overflow-hidden"
            >
              {suggestions.map((suggestion) => (
                <li key={suggestion.id} role="option">
                  <button
                    type="button"
                    onMouseDown={() => addRecipient(suggestion)}
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
          )}
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-bold text-text-dark mb-2"
          >
            Message
          </label>
          <AutoResizeTextarea
            id="message"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={10}
            required
            placeholder="Write your message…"
            className="min-h-[220px]"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
            loading && "opacity-60"
          )}
        >
          {loading ? "Sending…" : "Send Message"}
        </button>
      </div>
    </form>
  );
}
