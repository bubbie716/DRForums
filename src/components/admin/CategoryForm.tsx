"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/admin/actions";
import {
  getCategoryDeleteConfirmMessage,
  getCategoryDeleteSuccessMessage,
} from "@/lib/admin/deleteMessages";
import { SlugField } from "@/components/admin/SlugField";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputClassName } from "@/components/ui/fieldStyles";
import {
  useUnsavedChangesFlag,
  useUnsavedChangesForm,
} from "@/components/shared/unsaved-changes/UnsavedChangesProvider";

type CategoryFormProps = {
  mode: "create" | "edit";
  initialValues?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    isVisible: boolean;
    forumCount?: number;
    threadCount?: number;
  };
};

export function CategoryForm({ mode, initialValues }: CategoryFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [sortOrder, setSortOrder] = useState(initialValues?.sortOrder ?? 0);
  const [isVisible, setIsVisible] = useState(initialValues?.isVisible ?? true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { markSaved } = useUnsavedChangesForm("category-form");

  const baseline = useMemo(
    () => ({
      name: initialValues?.name ?? "",
      slug: initialValues?.slug ?? "",
      description: initialValues?.description ?? "",
      sortOrder: initialValues?.sortOrder ?? 0,
      isVisible: initialValues?.isVisible ?? true,
    }),
    [initialValues]
  );

  const isDirty = useMemo(
    () =>
      name !== baseline.name ||
      slug !== baseline.slug ||
      description !== baseline.description ||
      Number(sortOrder) !== baseline.sortOrder ||
      isVisible !== baseline.isVisible,
    [baseline, name, slug, description, sortOrder, isVisible]
  );

  useUnsavedChangesFlag("category-form", isDirty);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const input = {
      name,
      slug,
      description,
      sortOrder: Number(sortOrder),
      isVisible,
    };

    const result =
      mode === "create"
        ? await createCategory(input)
        : await updateCategory(initialValues!.id, input);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    markSaved();

    if (mode === "edit") {
      setSuccess("Category updated.");
      setLoading(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !initialValues) {
      return;
    }

    const forumCount = initialValues.forumCount ?? 0;
    const threadCount = initialValues.threadCount ?? 0;

    if (
      !window.confirm(
        getCategoryDeleteConfirmMessage(
          initialValues.name,
          forumCount,
          threadCount
        )
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setDeleting(true);

    const result = await deleteCategory(initialValues.id);

    if (!result.success) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    const notice = encodeURIComponent(
      getCategoryDeleteSuccessMessage(
        initialValues.name,
        result.deletedForums,
        result.deletedThreads
      )
    );

    markSaved();
    router.push(`/admin/forums?notice=${notice}`);
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

      <SlugField
        name={name}
        slug={slug}
        onNameChange={setName}
        onSlugChange={setSlug}
        nameLabel="Category Name"
      />

      <div className="space-y-2">
        <FieldLabel>Description</FieldLabel>
        <AutoResizeTextarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          maxLength={500}
          className={formInputClassName}
          placeholder="Optional description for this category"
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || loading}
            className="min-h-11 px-5 py-3 text-sm font-bold rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete Category"}
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
              ? "Create Category"
              : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
