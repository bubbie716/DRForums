"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearAllForumNotifications } from "@/lib/forum-notifications/actions";

export function ClearAllNotificationsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClear() {
    if (
      !window.confirm(
        "Clear all forum notifications? This cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    const result = await clearAllForumNotifications();

    if (!result.success) {
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClear}
      disabled={loading}
      className="w-full sm:w-auto min-h-11 px-4 py-2.5 text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 disabled:opacity-60"
    >
      {loading ? "Clearing…" : "Clear all"}
    </button>
  );
}
