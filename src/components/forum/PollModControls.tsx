"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { closePoll, deletePoll, reopenPoll } from "@/lib/poll/actions";

type PollModControlsProps = {
  pollId: string;
  isClosed: boolean;
  canCloseOwn: boolean;
  canManage: boolean;
};

export function PollModControls({
  pollId,
  isClosed,
  canCloseOwn,
  canManage,
}: PollModControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!canCloseOwn && !canManage) {
    return null;
  }

  async function runAction(
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>
  ) {
    setLoading(key);
    setError("");
    const result = await action();
    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      setLoading(null);
      return;
    }
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!isClosed && (canCloseOwn || canManage) ? (
          <button
            type="button"
            onClick={() => runAction("close", () => closePoll(pollId))}
            disabled={loading !== null}
            className="min-h-9 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-50"
          >
            {loading === "close" ? "…" : "Close poll"}
          </button>
        ) : null}

        {isClosed && canManage ? (
          <button
            type="button"
            onClick={() => runAction("reopen", () => reopenPoll(pollId))}
            disabled={loading !== null}
            className="min-h-9 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-50"
          >
            {loading === "reopen" ? "…" : "Reopen poll"}
          </button>
        ) : null}

        {canManage ? (
          <button
            type="button"
            onClick={() => runAction("delete", () => deletePoll(pollId))}
            disabled={loading !== null}
            className="min-h-9 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {loading === "delete" ? "…" : "Delete poll"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
