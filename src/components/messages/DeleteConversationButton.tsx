"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteConversationFromInbox } from "@/lib/messages/actions";

type DeleteConversationButtonProps = {
  conversationId: string;
};

export function DeleteConversationButton({
  conversationId,
}: DeleteConversationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Delete this conversation from your inbox?")) {
      return;
    }

    setLoading(true);
    const result = await deleteConversationFromInbox(conversationId);

    if (!result.success) {
      setLoading(false);
      return;
    }

    router.push("/messages?tab=direct");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="px-4 py-2 text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 disabled:opacity-60"
    >
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}
