"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { UserProfileLink } from "@/components/profile/UserProfileLink";
import { votePoll } from "@/lib/poll/actions";
import type { ThreadPollView } from "@/lib/poll/types";
import { PollModControls } from "@/components/forum/PollModControls";
import { cn, formatDate } from "@/lib/utils";

type PollCardProps = {
  poll: ThreadPollView;
  isLoggedIn?: boolean;
};

export function PollCard({ poll, isLoggedIn = false }: PollCardProps) {
  const router = useRouter();
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasVoted = poll.userVotedOptionIds.length > 0;
  const showResults = poll.isClosed || hasVoted;

  const statusLabel = poll.isClosed ? "Closed" : "Open";
  const statusClass = poll.isClosed
    ? "bg-surface text-text-secondary border-border"
    : "bg-yellow/40 text-accent border-accent/30";

  const selectedSet = useMemo(
    () => new Set(selectedOptionIds),
    [selectedOptionIds]
  );

  function toggleOption(optionId: string) {
    if (poll.allowMultiple) {
      setSelectedOptionIds((current) =>
        current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
      );
      return;
    }
    setSelectedOptionIds([optionId]);
  }

  async function handleVote() {
    setLoading(true);
    setError("");
    const result = await votePoll(poll.id, selectedOptionIds);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <section className="bg-white border border-border rounded-2xl shadow-warm">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-border bg-gradient-to-r from-cream via-surface to-yellow/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Poll
            </p>
            <h2 className="mt-1 text-lg md:text-xl font-extrabold text-text-dark break-words">
              {poll.question}
            </h2>
            <p className="text-sm text-text-secondary mt-2">
              {poll.allowMultiple ? "Multiple choice" : "Single choice"}
              <span className="mx-2">·</span>
              {poll.isAnonymous ? "Anonymous" : "Visible voting"}
              {poll.closesAt ? (
                <>
                  <span className="mx-2">·</span>
                  Closes{" "}
                  <time dateTime={poll.closesAt}>
                    {formatDate(new Date(poll.closesAt))}
                  </time>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            <span
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${statusClass}`}
            >
              {poll.isClosed ? "Poll Closed" : statusLabel}
            </span>
            <PollModControls
              pollId={poll.id}
              isClosed={poll.isClosed}
              canCloseOwn={poll.canCloseOwn}
              canManage={poll.canManage}
            />
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6 space-y-4">
        {error ? (
          <div
            role="alert"
            className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {error}
          </div>
        ) : null}

        {poll.options.map((option) => {
          const isSelected = showResults
            ? poll.userVotedOptionIds.includes(option.id)
            : selectedSet.has(option.id);

          return (
            <div key={option.id} className="space-y-2">
              {showResults ? (
                <PollResultOption
                  label={option.label}
                  voteCount={option.voteCount}
                  percentage={option.percentage}
                  isSelected={isSelected}
                  voters={option.voters}
                  isAnonymous={poll.isAnonymous}
                  allowMultiple={poll.allowMultiple}
                />
              ) : (
                <PollOptionChoice
                  label={option.label}
                  inputType={poll.allowMultiple ? "checkbox" : "radio"}
                  name={`poll-${poll.id}`}
                  checked={isSelected}
                  disabled={loading}
                  onSelect={() => toggleOption(option.id)}
                />
              )}
            </div>
          );
        })}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <p className="text-sm text-text-secondary">
            {poll.totalVoters} {poll.totalVoters === 1 ? "voter" : "voters"}
            {poll.allowMultiple ? (
              <>
                <span className="mx-2">·</span>
                {poll.totalVotes} total{" "}
                {poll.totalVotes === 1 ? "selection" : "selections"}
              </>
            ) : null}
          </p>

          {poll.canVote && !showResults ? (
            <button
              type="button"
              onClick={handleVote}
              disabled={loading || selectedOptionIds.length === 0}
              className="min-h-11 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
            >
              {loading ? "Submitting…" : "Vote"}
            </button>
          ) : null}

          {!poll.canVote && !showResults && !poll.isClosed ? (
            <p className="text-sm font-medium text-text-secondary">
              {poll.isBanned
                ? "You cannot vote while banned."
                : isLoggedIn
                  ? "You do not have permission to vote in this poll."
                  : "Sign in to vote in this poll."}
            </p>
          ) : null}

          {poll.isClosed && !hasVoted ? (
            <p className="text-sm font-medium text-text-secondary">
              This poll is closed. Voting is no longer available.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type PollOptionChoiceProps = {
  label: string;
  inputType: "checkbox" | "radio";
  name: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

function PollOptionChoice({
  label,
  inputType,
  name,
  checked,
  disabled = false,
  onSelect,
}: PollOptionChoiceProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-4 rounded-xl border border-border bg-cream/50 px-4 py-3.5 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-accent/40"
      )}
    >
      <input
        type={inputType}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center border-2 transition-colors",
          inputType === "checkbox" ? "rounded-md" : "rounded-full",
          checked
            ? "border-accent bg-gradient-orange"
            : "border-border bg-white"
        )}
      >
        {checked && inputType === "checkbox" ? (
          <svg
            viewBox="0 0 12 12"
            fill="none"
            className="size-2.5 text-white"
            aria-hidden="true"
          >
            <path
              d="M2.5 6.2 4.8 8.5 9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-text-dark">
        {label}
      </span>
    </label>
  );
}

type PollResultOptionProps = {
  label: string;
  voteCount: number;
  percentage: number;
  isSelected: boolean;
  voters: { id: string; username: string }[];
  isAnonymous: boolean;
  allowMultiple: boolean;
};

function PollResultOption({
  label,
  voteCount,
  percentage,
  isSelected,
  voters,
  isAnonymous,
  allowMultiple,
}: PollResultOptionProps) {
  const [showVoters, setShowVoters] = useState(false);

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        isSelected
          ? "border-accent/50 bg-yellow/20"
          : "border-border bg-cream/40"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-dark">{label}</p>
        <p className="text-sm font-bold text-accent shrink-0">
          {percentage}%
          <span className="sr-only">
            {allowMultiple ? " of voters selected this option" : " of voters"}
          </span>
        </p>
      </div>

      <div className="mt-2 h-2.5 rounded-full bg-yellow/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-orange transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
        <span>
          {voteCount}{" "}
          {allowMultiple
            ? voteCount === 1
              ? "selection"
              : "selections"
            : voteCount === 1
              ? "vote"
              : "votes"}
          {allowMultiple ? ` (${percentage}% of voters)` : null}
        </span>

        {!isAnonymous && voters.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowVoters((current) => !current)}
            className="font-semibold text-accent hover:underline"
          >
            {showVoters ? "Hide voters" : "View voters"}
          </button>
        ) : null}
      </div>

      {!isAnonymous && showVoters && voters.length > 0 ? (
        <p className="mt-2 text-xs text-text-secondary leading-relaxed">
          {voters.map((voter, index) => (
            <span key={voter.id}>
              {index > 0 ? ", " : null}
              <UserProfileLink
                username={voter.username}
                className="font-semibold text-text-dark hover:text-accent"
              />
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
