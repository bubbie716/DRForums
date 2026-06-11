"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createReply } from "@/lib/forum/actions";
import { BBCodeEditor } from "@/components/forum/BBCodeEditor";
import { useQuoteReply } from "@/components/shared/QuoteReplyContext";

type ReplyFormProps = {
  threadId: string;
};

export function ReplyForm({ threadId }: ReplyFormProps) {
  const router = useRouter();
  const { registerReplyHandler } = useQuoteReply();
  const [content, setContent] = useState("");
  const [replyToPostId, setReplyToPostId] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return registerReplyHandler(({ quoteText, replyToPostId: postId }) => {
      setContent(quoteText);
      setReplyToPostId(postId);
      setError("");
    });
  }, [registerReplyHandler]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await createReply(threadId, content, replyToPostId);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setContent("");
    setReplyToPostId(undefined);
    setLoading(false);
    router.refresh();
  }

  return (
    <form
      id="reply-form"
      onSubmit={handleSubmit}
      className="bg-white border border-border rounded-2xl shadow-warm p-4 md:p-6"
    >
      <h3 className="font-bold text-text-dark mb-4">Post a Reply</h3>

      {error && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <BBCodeEditor
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          if (replyToPostId) {
            setReplyToPostId(undefined);
          }
        }}
        rows={4}
        placeholder="Write your reply… Use @ to mention someone"
      />

      <div className="mt-4 flex justify-stretch md:justify-end">
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto min-h-11 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
        >
          {loading ? "Posting…" : "Post Reply"}
        </button>
      </div>
    </form>
  );
}
