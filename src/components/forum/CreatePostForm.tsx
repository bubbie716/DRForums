"use client";

import { useState } from "react";
import { createThread } from "@/lib/forum/actions";
import { MentionTextarea } from "@/components/mentions/MentionTextarea";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputClassName } from "@/components/ui/fieldStyles";
import { ForumPicker } from "@/components/forum/ForumPicker";

export type PostCategoryOption = {
  name: string;
  forums: { slug: string; name: string }[];
};

type CreatePostFormProps = {
  categories: PostCategoryOption[];
};

export function CreatePostForm({ categories }: CreatePostFormProps) {
  const defaultSlug = categories[0]?.forums[0]?.slug ?? "";
  const [forumSlug, setForumSlug] = useState(defaultSlug);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <FieldLabel>Forum</FieldLabel>
        <ForumPicker
          categories={categories}
          value={forumSlug}
          onChange={setForumSlug}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Thread Title</FieldLabel>
        <input
          id="post-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
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
          id="post-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={8}
          required
          minLength={10}
          placeholder="Share your thoughts… Use @ to mention someone"
        />
        <p className="text-xs text-text-secondary">Minimum 10 characters.</p>
      </div>

      <div className="flex justify-stretch md:justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !forumSlug}
          className="w-full md:w-auto min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
        >
          {loading ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
