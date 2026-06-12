"use client";

import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputClassName } from "@/components/ui/fieldStyles";
import type { PollCreateInput } from "@/lib/poll/types";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;

type PollBuilderProps = {
  value: PollCreateInput | null;
  onChange: (value: PollCreateInput | null) => void;
};

const defaultPollInput = (): PollCreateInput => ({
  question: "",
  options: ["", ""],
  allowMultiple: false,
  isAnonymous: false,
  closesAt: null,
});

export function PollBuilder({ value, onChange }: PollBuilderProps) {
  const poll = value ?? defaultPollInput();

  function updatePoll(patch: Partial<PollCreateInput>) {
    onChange({ ...poll, ...patch });
  }

  function updateOption(index: number, label: string) {
    const options = [...poll.options];
    options[index] = label;
    updatePoll({ options });
  }

  function addOption() {
    if (poll.options.length >= MAX_OPTIONS) {
      return;
    }
    updatePoll({ options: [...poll.options, ""] });
  }

  function removeOption(index: number) {
    if (poll.options.length <= MIN_OPTIONS) {
      return;
    }
    updatePoll({
      options: poll.options.filter((_, optionIndex) => optionIndex !== index),
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-cream/60 p-4 md:p-5 space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Poll
        </p>
        <p className="text-sm text-text-secondary mt-1">
          Attach a poll to this thread. Minimum {MIN_OPTIONS} options.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="poll-question" className="block text-sm font-bold text-text-dark">
          Question
        </label>
        <input
          id="poll-question"
          type="text"
          value={poll.question}
          onChange={(event) => updatePoll({ question: event.target.value })}
          placeholder="What should the community decide?"
          maxLength={300}
          className={formInputClassName}
        />
      </div>

      <div className="space-y-3">
        <FieldLabel>Options</FieldLabel>
        {poll.options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={option}
              onChange={(event) => updateOption(index, event.target.value)}
              placeholder={`Option ${index + 1}`}
              maxLength={120}
              className={formInputClassName}
            />
            <button
              type="button"
              onClick={() => removeOption(index)}
              disabled={poll.options.length <= MIN_OPTIONS}
              className="shrink-0 min-h-11 px-3 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addOption}
          disabled={poll.options.length >= MAX_OPTIONS}
          className="min-h-10 px-4 text-xs font-semibold rounded-lg border border-dashed border-accent/40 bg-white text-accent hover:bg-yellow/20 transition-colors disabled:opacity-40"
        >
          Add option
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={poll.allowMultiple}
            onChange={(event) =>
              updatePoll({ allowMultiple: event.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
          />
          <span>
            <span className="block text-sm font-semibold text-text-dark">
              Multiple choice
            </span>
            <span className="block text-xs text-text-secondary mt-0.5">
              Voters can select more than one option.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={poll.isAnonymous}
            onChange={(event) =>
              updatePoll({ isAnonymous: event.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
          />
          <span>
            <span className="block text-sm font-semibold text-text-dark">
              Anonymous voting
            </span>
            <span className="block text-xs text-text-secondary mt-0.5">
              Hide who voted for each option.
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="poll-closes-at" className="block text-sm font-bold text-text-dark">
          Close date (optional)
        </label>
        <input
          id="poll-closes-at"
          type="datetime-local"
          value={poll.closesAt ? toLocalDateTimeValue(poll.closesAt) : ""}
          onChange={(event) =>
            updatePoll({
              closesAt: event.target.value
                ? new Date(event.target.value).toISOString()
                : null,
            })
          }
          className={formInputClassName}
        />
        <p className="text-xs text-text-secondary">
          Leave blank to keep the poll open until manually closed.
        </p>
      </div>
    </div>
  );
}

function toLocalDateTimeValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}
