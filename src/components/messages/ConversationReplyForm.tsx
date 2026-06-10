"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { replyToConversation } from "@/lib/messages/actions";
import { MentionTextarea } from "@/components/mentions/MentionTextarea";
import { useQuoteReply } from "@/components/shared/QuoteReplyContext";
import { cn } from "@/lib/utils";

type ConversationReplyFormProps = {
  conversationId: string;
};

export function ConversationReplyForm({
  conversationId,
}: ConversationReplyFormProps) {
  const router = useRouter();
  const { registerReplyHandler } = useQuoteReply();
  const [content, setContent] = useState("");
  const [replyToMessageId, setReplyToMessageId] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return registerReplyHandler(({ quoteText, replyToMessageId: messageId }) => {
      setContent(quoteText);
      setReplyToMessageId(messageId);
      setError("");
    });
  }, [registerReplyHandler]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await replyToConversation(
      conversationId,
      content,
      replyToMessageId
    );

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setContent("");
    setReplyToMessageId(undefined);
    setLoading(false);
    router.refresh();
  }

  return (
    <form
      id="reply-form"
      onSubmit={handleSubmit}
      className="bg-white border border-border rounded-2xl shadow-warm p-4 md:p-6"
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

      <MentionTextarea
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          if (replyToMessageId) {
            setReplyToMessageId(undefined);
          }
        }}
        rows={5}
        placeholder="Write your reply… Use @ to mention someone"
      />

      <div className="mt-4 flex justify-stretch md:justify-end">
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full md:w-auto min-h-11 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
            loading && "opacity-60"
          )}
        >
          {loading ? "Sending…" : "Send Reply"}
        </button>
      </div>
    </form>
  );
}
