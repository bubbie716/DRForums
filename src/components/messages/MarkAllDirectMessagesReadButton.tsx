"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markAllDirectMessagesAsRead } from "@/lib/messages/actions";

export function MarkAllDirectMessagesReadButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleMarkAllRead() {
    setLoading(true);
    const result = await markAllDirectMessagesAsRead();

    if (!result.success) {
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleMarkAllRead}
      disabled={loading}
      className="w-full sm:w-auto min-h-11 px-4 py-2.5 text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-hover hover:text-text-dark transition-all duration-200 disabled:opacity-60"
    >
      {loading ? "Marking…" : "Mark all as read"}
    </button>
  );
}
