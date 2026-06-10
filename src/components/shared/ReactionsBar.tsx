"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactionType } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  REACTION_META,
  REACTION_TYPES,
  type ReactionCounts,
  type ToggleReactionResult,
} from "@/lib/forum/reactions";

type ReactionsBarProps = {
  itemId: string;
  counts: ReactionCounts;
  userReactions: ReactionType[];
  isLoggedIn: boolean;
  onToggle: (type: ReactionType) => Promise<ToggleReactionResult>;
};

const expandedStateByItem = new Map<string, boolean>();

function SmileyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.75" fill="currentColor" stroke="none" />
      <path d="M8.5 14.2c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" />
    </svg>
  );
}

type StackedReactionBadgeProps = {
  emoji: string;
  label: string;
  count: number;
  isActive: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
  onClick: () => void;
};

function StackedReactionBadge({
  emoji,
  label,
  count,
  isActive,
  isLoading,
  isLoggedIn,
  onClick,
}: StackedReactionBadgeProps) {
  const stackLayers = Math.min(count, 3);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isLoggedIn || isLoading}
      title={isLoggedIn ? label : "Sign in to react"}
      aria-label={`${label}, ${count}`}
      aria-pressed={isActive}
      className={cn(
        "inline-flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full text-sm font-semibold border transition-all duration-200 shrink-0",
        isActive
          ? "bg-yellow/50 border-accent text-accent-dark"
          : "bg-cream border-border text-text-secondary hover:border-accent/40 hover:bg-hover hover:text-text-dark",
        !isLoggedIn && "cursor-default opacity-90",
        isLoading && "opacity-60"
      )}
    >
      <span className="relative inline-flex items-center justify-center w-6 h-5">
        {stackLayers > 1 &&
          Array.from({ length: stackLayers - 1 }).map((_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="absolute text-sm leading-none opacity-50"
              style={{
                left: `${(stackLayers - 2 - index) * 3}px`,
                top: `${index * 1}px`,
                zIndex: index,
              }}
            >
              {emoji}
            </span>
          ))}
        <span
          aria-hidden="true"
          className="relative z-10 text-sm leading-none"
          style={{
            marginLeft: stackLayers > 1 ? `${(stackLayers - 1) * 3}px` : 0,
          }}
        >
          {emoji}
        </span>
      </span>
      {count > 1 && (
        <span className="tabular-nums text-xs font-bold">{count}</span>
      )}
    </button>
  );
}

export function ReactionsBar({
  itemId,
  counts: initialCounts,
  userReactions: initialUserReactions,
  isLoggedIn,
  onToggle,
}: ReactionsBarProps) {
  const [counts, setCounts] = useState(initialCounts);
  const [userReactions, setUserReactions] = useState(initialUserReactions);
  const [loading, setLoading] = useState<ReactionType | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(
    () => expandedStateByItem.get(itemId) ?? false
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const hasUserReaction = userReactions.length > 0;
  const activeReactionTypes = REACTION_TYPES.filter((type) => counts[type] > 0);

  useEffect(() => {
    expandedStateByItem.set(itemId, expanded);
  }, [expanded, itemId]);

  useEffect(() => {
    if (!expanded) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setExpanded(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded]);

  async function handleReaction(type: ReactionType) {
    if (!isLoggedIn) {
      return;
    }

    setError("");
    setLoading(type);

    const result = await onToggle(type);

    if (!result.success) {
      setError(result.error);
      setLoading(null);
      return;
    }

    setCounts(result.counts);
    setUserReactions(result.userReactions);
    setLoading(null);
    setExpanded(false);
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      {error && (
        <p role="alert" className="mb-3 text-xs text-red-600">
          {error}
        </p>
      )}

      <div ref={containerRef} className="flex items-center flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          title={isLoggedIn ? "Add a reaction" : "Sign in to react"}
          aria-label={isLoggedIn ? "Add a reaction" : "Sign in to react"}
          aria-expanded={expanded}
          aria-haspopup="true"
          className={cn(
            "inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 shrink-0",
            expanded
              ? "bg-yellow/40 border-accent/50 text-accent-dark"
              : "bg-cream border-border text-text-secondary hover:border-accent/40 hover:bg-hover hover:text-text-dark",
            hasUserReaction && !expanded && "border-accent/40 bg-yellow/30",
            !isLoggedIn && "opacity-80"
          )}
        >
          <SmileyIcon className="w-5 h-5" />
        </button>

        <div
          className={cn(
            "flex items-center gap-2 overflow-hidden transition-all duration-300 ease-out",
            expanded
              ? "max-w-[400px] opacity-100 pointer-events-auto"
              : "max-w-0 opacity-0 pointer-events-none"
          )}
        >
          {REACTION_TYPES.map((type) => {
            const { label, emoji } = REACTION_META[type];
            const isActive = userReactions.includes(type);
            const isLoading = loading === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => handleReaction(type)}
                disabled={!isLoggedIn || isLoading}
                title={isLoggedIn ? label : "Sign in to react"}
                aria-label={label}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex items-center justify-center w-9 h-9 rounded-full text-base border transition-all duration-200 shrink-0",
                  isActive
                    ? "bg-yellow/50 border-accent"
                    : "bg-cream border-border hover:border-accent/40 hover:bg-hover",
                  !isLoggedIn && "opacity-80",
                  isLoading && "opacity-60"
                )}
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            );
          })}
        </div>

        {activeReactionTypes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeReactionTypes.map((type) => {
              const { label, emoji } = REACTION_META[type];
              const count = counts[type];
              const isActive = userReactions.includes(type);
              const isLoading = loading === type;

              return (
                <StackedReactionBadge
                  key={type}
                  emoji={emoji}
                  label={label}
                  count={count}
                  isActive={isActive}
                  isLoading={isLoading}
                  isLoggedIn={isLoggedIn}
                  onClick={() => handleReaction(type)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
