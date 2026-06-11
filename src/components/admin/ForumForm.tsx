"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createForum, deleteForum, updateForum } from "@/lib/admin/actions";
import { SlugField } from "@/components/admin/SlugField";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputClassName } from "@/components/ui/fieldStyles";

type CategoryOption = {
  id: string;
  name: string;
};

type ForumFormProps = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  initialValues?: {
    id: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    isVisible: boolean;
    isLocked: boolean;
    threadCount?: number;
  };
  defaultCategoryId?: string;
};

export function ForumForm({
  mode,
  categories,
  initialValues,
  defaultCategoryId,
}: ForumFormProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(
    initialValues?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? ""
  );
  const [name, setName] = useState(initialValues?.name ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [sortOrder, setSortOrder] = useState(initialValues?.sortOrder ?? 0);
  const [isVisible, setIsVisible] = useState(initialValues?.isVisible ?? true);
  const [isLocked, setIsLocked] = useState(initialValues?.isLocked ?? false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedCategory = categories.find((category) => category.id === categoryId);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const input = {
      categoryId,
      name,
      slug,
      description,
      sortOrder: Number(sortOrder),
      isVisible,
      isLocked,
    };

    const result =
      mode === "create"
        ? await createForum(input)
        : await updateForum(initialValues!.id, input);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (mode === "edit") {
      setSuccess("Subcategory updated.");
      setLoading(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !initialValues) {
      return;
    }

    if (
      !window.confirm("Delete this subcategory? This cannot be undone.")
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setDeleting(true);

    const result = await deleteForum(initialValues.id);

    if (!result.success) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    router.push("/admin/forums");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-border rounded-2xl shadow-warm p-4 md:p-6 lg:p-8 space-y-6"
    >
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm"
        >
          {success}
        </div>
      )}

      <div className="space-y-2">
        <FieldLabel>Parent Category</FieldLabel>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
          className={formInputClassName}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <SlugField
        name={name}
        slug={slug}
        onNameChange={setName}
        onSlugChange={setSlug}
        nameLabel="Subcategory Name"
        slugLabel="Subcategory URL name"
        slugPrefix={selectedCategory?.name}
      />

      <div className="space-y-2">
        <FieldLabel>Description</FieldLabel>
        <AutoResizeTextarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          maxLength={500}
          className={formInputClassName}
          placeholder="Optional description for this subcategory"
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Display order</FieldLabel>
        <input
          type="number"
          min={0}
          step={1}
          value={sortOrder}
          onChange={(event) => setSortOrder(Number(event.target.value))}
          className={formInputClassName}
        />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 min-h-11 cursor-pointer">
          <input
            type="checkbox"
            checked={isVisible}
            onChange={(event) => setIsVisible(event.target.checked)}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent/20"
          />
          <span className="text-sm font-medium text-text-dark">
            Visible on the forum homepage
          </span>
        </label>

        <label className="flex items-center gap-3 min-h-11 cursor-pointer">
          <input
            type="checkbox"
            checked={isLocked}
            onChange={(event) => setIsLocked(event.target.checked)}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent/20"
          />
          <span className="text-sm font-medium text-text-dark">
            Locked (members cannot create new threads here)
          </span>
        </label>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || loading}
            className="min-h-11 px-5 py-3 text-sm font-bold rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete Subcategory"}
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          disabled={loading || deleting}
          className="min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all duration-200 disabled:opacity-60"
        >
          {loading
            ? "Saving…"
            : mode === "create"
              ? "Create Subcategory"
              : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
