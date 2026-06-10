"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleThreadLock, toggleThreadPin } from "@/lib/forum/actions";

type ModThreadControlsProps = {
  threadId: string;
  isPinned: boolean;
  isLocked: boolean;
};

export function ModThreadControls({
  threadId,
  isPinned,
  isLocked,
}: ModThreadControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePin() {
    setLoading("pin");
    await toggleThreadPin(threadId);
    router.refresh();
    setLoading(null);
  }

  async function handleLock() {
    setLoading("lock");
    await toggleThreadLock(threadId);
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handlePin}
        disabled={loading !== null}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-50"
      >
        {loading === "pin" ? "…" : isPinned ? "Unpin" : "Pin"}
      </button>
      <button
        type="button"
        onClick={handleLock}
        disabled={loading !== null}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-50"
      >
        {loading === "lock" ? "…" : isLocked ? "Unlock" : "Lock"}
      </button>
    </div>
  );
}
