"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { replyToConversation } from "@/lib/messages/actions";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { cn } from "@/lib/utils";

type ConversationReplyFormProps = {
  conversationId: string;
};

export function ConversationReplyForm({
  conversationId,
}: ConversationReplyFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await replyToConversation(conversationId, content);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setContent("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-border rounded-2xl shadow-warm p-6"
    >
      <h3 className="font-bold text-text-dark mb-4">Reply</h3>

      {error && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <AutoResizeTextarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={5}
        required
        placeholder="Write your reply…"
      />

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
            loading && "opacity-60"
          )}
        >
          {loading ? "Sending…" : "Send Reply"}
        </button>
      </div>
    </form>
  );
}
