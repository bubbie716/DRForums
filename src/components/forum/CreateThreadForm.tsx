"use client";

import { useState } from "react";
import { createThread } from "@/lib/forum/actions";
import { BBCodeEditor } from "@/components/forum/BBCodeEditor";
import { PollBuilder } from "@/components/forum/PollBuilder";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputClassName } from "@/components/ui/fieldStyles";
import type { PollCreateInput } from "@/lib/poll/types";

type CreateThreadFormProps = {
  forumSlug: string;
  canCreatePoll?: boolean;
};

export function CreateThreadForm({
  forumSlug,
  canCreatePoll = false,
}: CreateThreadFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [addPoll, setAddPoll] = useState(false);
  const [pollInput, setPollInput] = useState<PollCreateInput | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const showPollBuilder = canCreatePoll;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await createThread(
      forumSlug,
      title,
      content,
      addPoll && showPollBuilder ? pollInput : null
    );

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-border rounded-2xl shadow-warm p-4 md:p-6 lg:p-8"
    >
      {error && (
        <div
          role="alert"
          className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-2">
          <FieldLabel>Thread Title</FieldLabel>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={5}
            maxLength={200}
            placeholder="What should we add to City Hall?"
            className={formInputClassName}
          />
          <p className="text-xs text-text-secondary">Minimum 5 characters.</p>
        </div>

        <div className="space-y-2">
          <FieldLabel>
            Content{addPoll && showPollBuilder ? " (optional)" : ""}
          </FieldLabel>
          <BBCodeEditor
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            required={!(addPoll && showPollBuilder)}
            minLength={addPoll && showPollBuilder ? undefined : 10}
            placeholder="Share your thoughts… Use @ to mention someone"
          />
          <p className="text-xs text-text-secondary">
            {addPoll && showPollBuilder
              ? "Optional when attaching a poll. If provided, minimum 10 characters of text (BBCode tags don't count)."
              : "Minimum 10 characters of text (BBCode tags don't count)."}
          </p>
        </div>

        {showPollBuilder ? (
          <div className="space-y-4">
            <label className="flex items-start gap-3 rounded-xl border border-border bg-cream/40 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addPoll}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setAddPoll(enabled);
                  if (enabled && !pollInput) {
                    setPollInput({
                      question: "",
                      options: ["", ""],
                      allowMultiple: false,
                      isAnonymous: false,
                      closesAt: null,
                    });
                  }
                  if (!enabled) {
                    setPollInput(null);
                  }
                }}
                className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
              />
              <span>
                <span className="block text-sm font-semibold text-text-dark">
                  Add poll
                </span>
                <span className="block text-xs text-text-secondary mt-0.5">
                  Attach a single-choice or multiple-choice poll to this thread.
                </span>
              </span>
            </label>

            {addPoll && pollInput ? (
              <PollBuilder value={pollInput} onChange={setPollInput} />
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-stretch md:justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create Thread"}
          </button>
        </div>
      </div>
    </form>
  );
}
