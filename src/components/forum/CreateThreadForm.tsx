"use client";

import { useState } from "react";
import { createThread } from "@/lib/forum/actions";
import { MentionTextarea } from "@/components/mentions/MentionTextarea";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputClassName } from "@/components/ui/fieldStyles";

type CreateThreadFormProps = {
  forumSlug: string;
};

export function CreateThreadForm({ forumSlug }: CreateThreadFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await createThread(forumSlug, title, content);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-border rounded-2xl shadow-warm p-4 md:p-6 lg:p-8"
    >
      {error && (
        <div
          role="alert"
          className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-2">
          <FieldLabel>Thread Title</FieldLabel>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={5}
            maxLength={200}
            placeholder="What should we add to City Hall?"
            className={formInputClassName}
          />
          <p className="text-xs text-text-secondary">Minimum 5 characters.</p>
        </div>

        <div className="space-y-2">
          <FieldLabel>Content</FieldLabel>
          <MentionTextarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            required
            minLength={10}
            placeholder="Share your thoughts… Use @ to mention someone"
          />
          <p className="text-xs text-text-secondary">Minimum 10 characters.</p>
        </div>

        <div className="flex justify-stretch md:justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create Thread"}
          </button>
        </div>
      </div>
    </form>
  );
}
