"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  deleteCategory,
  deleteForum,
  moveCategoryOrder,
  moveForumOrder,
  toggleCategoryVisibility,
  toggleForumLock,
  toggleForumVisibility,
  updateCategory,
  updateForum,
} from "@/lib/admin/actions";
import {
  getCategoryDeleteConfirmMessage,
  getCategoryDeleteSuccessMessage,
} from "@/lib/admin/deleteMessages";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { cn } from "@/lib/utils";

type AdminForum = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  isLocked: boolean;
  threadCount: number;
};

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  forumCount: number;
  forums: AdminForum[];
};

type ForumManagementListProps = {
  categories: AdminCategory[];
};

type CategoryDraft = {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
};

type ForumDraft = {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
};

function ActionButton({
  children,
  onClick,
  variant = "default",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-9 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-60",
        variant === "default" &&
          "border-border text-text-dark hover:bg-hover",
        variant === "primary" &&
          "border-accent/40 bg-gradient-orange text-white hover:shadow-warm",
        variant === "danger" &&
          "border-red-200 text-red-700 hover:bg-red-50"
      )}
    >
      {children}
    </button>
  );
}

function buildCategoryDrafts(categories: AdminCategory[]) {
  return Object.fromEntries(
    categories.map((category) => [
      category.id,
      {
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        sortOrder: category.sortOrder,
      },
    ])
  );
}

function buildForumDrafts(categories: AdminCategory[]) {
  return Object.fromEntries(
    categories.flatMap((category) =>
      category.forums.map((forum) => [
        forum.id,
        {
          name: forum.name,
          slug: forum.slug,
          description: forum.description ?? "",
          sortOrder: forum.sortOrder,
        },
      ])
    )
  );
}

export function ForumManagementList({ categories }: ForumManagementListProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, CategoryDraft>>(
    () => buildCategoryDrafts(categories)
  );
  const [forumDrafts, setForumDrafts] = useState<Record<string, ForumDraft>>(() =>
    buildForumDrafts(categories)
  );

  useEffect(() => {
    setCategoryDrafts(buildCategoryDrafts(categories));
    setForumDrafts(buildForumDrafts(categories));
  }, [categories]);

  async function runAction(
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>
  ) {
    setError("");
    setSuccess("");
    setPendingKey(key);

    const result = await action();

    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      setPendingKey(null);
      return;
    }

    setPendingKey(null);
    router.refresh();
  }

  function updateCategoryDraft(
    categoryId: string,
    field: keyof CategoryDraft,
    value: string | number
  ) {
    setCategoryDrafts((current) => ({
      ...current,
      [categoryId]: {
        ...current[categoryId],
        [field]: value,
      },
    }));
  }

  function updateForumDraft(
    forumId: string,
    field: keyof ForumDraft,
    value: string | number
  ) {
    setForumDrafts((current) => ({
      ...current,
      [forumId]: {
        ...current[forumId],
        [field]: value,
      },
    }));
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-warm px-6 py-16 text-center">
        <p className="text-text-secondary">
          No categories yet. Create your first category to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {categories.map((category, categoryIndex) => {
        const categoryThreadCount = category.forums.reduce(
          (total, forum) => total + forum.threadCount,
          0
        );
        const categoryDraft = categoryDrafts[category.id];

        return (
          <section
            key={category.id}
            className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden"
          >
            <div className="px-4 md:px-6 py-4 md:py-5 border-b border-border bg-surface/60">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {!category.isVisible && <AdminStatusBadge label="Hidden" />}
                  <AdminStatusBadge
                    label={`${category.forumCount} ${
                      category.forumCount === 1 ? "subcategory" : "subcategories"
                    }`}
                    variant="warning"
                  />
                </div>

                {categoryDraft ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel>Category name</FieldLabel>
                      <input
                        type="text"
                        value={categoryDraft.name}
                        onChange={(event) =>
                          updateCategoryDraft(category.id, "name", event.target.value)
                        }
                        className="form-field mt-1"
                        maxLength={100}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Description</FieldLabel>
                      <AutoResizeTextarea
                        value={categoryDraft.description}
                        onChange={(event) =>
                          updateCategoryDraft(
                            category.id,
                            "description",
                            event.target.value
                          )
                        }
                        rows={2}
                        maxLength={500}
                        className="form-field mt-1"
                        placeholder="Optional description shown on the forum homepage"
                      />
                    </div>
                    <div>
                      <FieldLabel>URL name</FieldLabel>
                      <input
                        type="text"
                        value={categoryDraft.slug}
                        onChange={(event) =>
                          updateCategoryDraft(
                            category.id,
                            "slug",
                            event.target.value.toLowerCase()
                          )
                        }
                        className="form-field mt-1 font-mono text-sm"
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <FieldLabel>Sort order</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={categoryDraft.sortOrder}
                        onChange={(event) =>
                          updateCategoryDraft(
                            category.id,
                            "sortOrder",
                            Number(event.target.value)
                          )
                        }
                        className="form-field mt-1"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    variant="primary"
                    onClick={() =>
                      runAction(`cat-save-${category.id}`, async () => {
                        if (!categoryDraft) {
                          return { success: false, error: "Missing category data." };
                        }

                        const result = await updateCategory(category.id, {
                          name: categoryDraft.name,
                          slug: categoryDraft.slug,
                          description: categoryDraft.description,
                          sortOrder: categoryDraft.sortOrder,
                          isVisible: category.isVisible,
                        });

                        if (result.success) {
                          setSuccess("Category saved.");
                        }

                        return result;
                      })
                    }
                    disabled={pendingKey !== null}
                  >
                    Save Category
                  </ActionButton>
                  <ActionButton
                    onClick={() =>
                      runAction(`cat-up-${category.id}`, () =>
                        moveCategoryOrder(category.id, "up")
                      )
                    }
                    disabled={pendingKey !== null || categoryIndex === 0}
                  >
                    Move Up
                  </ActionButton>
                  <ActionButton
                    onClick={() =>
                      runAction(`cat-down-${category.id}`, () =>
                        moveCategoryOrder(category.id, "down")
                      )
                    }
                    disabled={
                      pendingKey !== null ||
                      categoryIndex === categories.length - 1
                    }
                  >
                    Move Down
                  </ActionButton>
                  <ActionButton
                    onClick={() =>
                      runAction(`cat-vis-${category.id}`, () =>
                        toggleCategoryVisibility(category.id)
                      )
                    }
                    disabled={pendingKey !== null}
                  >
                    {category.isVisible ? "Hide" : "Show"}
                  </ActionButton>
                  <Link
                    href={`/admin/forums/categories/${category.id}/edit#access`}
                    className="min-h-9 inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg border border-border text-text-dark hover:bg-hover transition-colors"
                  >
                    Permissions
                  </Link>
                  <Link
                    href={`/admin/forums/new?categoryId=${category.id}`}
                    className="min-h-9 inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg border border-border text-text-dark hover:bg-hover transition-colors"
                  >
                    Add Subcategory
                  </Link>
                  <ActionButton
                    variant="danger"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          getCategoryDeleteConfirmMessage(
                            category.name,
                            category.forumCount,
                            categoryThreadCount
                          )
                        )
                      ) {
                        return;
                      }

                      setError("");
                      setSuccess("");
                      setPendingKey(`cat-del-${category.id}`);

                      const result = await deleteCategory(category.id);

                      if (!result.success) {
                        setError(result.error);
                        setPendingKey(null);
                        return;
                      }

                      setSuccess(
                        getCategoryDeleteSuccessMessage(
                          category.name,
                          result.deletedForums,
                          result.deletedThreads
                        )
                      );
                      setPendingKey(null);
                      router.refresh();
                    }}
                    disabled={pendingKey !== null}
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            </div>

            {category.forums.length > 0 ? (
              <div className="divide-y divide-border/70">
                {category.forums.map((forum, forumIndex) => {
                  const forumDraft = forumDrafts[forum.id];

                  return (
                    <div
                      key={forum.id}
                      className="px-4 md:px-6 py-4 flex flex-col gap-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {!forum.isVisible && <AdminStatusBadge label="Hidden" />}
                        {forum.isLocked && (
                          <AdminStatusBadge label="Locked" variant="warning" />
                        )}
                        <AdminStatusBadge
                          label={`${forum.threadCount} ${
                            forum.threadCount === 1 ? "thread" : "threads"
                          }`}
                        />
                      </div>

                      {forumDraft ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <FieldLabel>Subcategory name</FieldLabel>
                            <input
                              type="text"
                              value={forumDraft.name}
                              onChange={(event) =>
                                updateForumDraft(forum.id, "name", event.target.value)
                              }
                              className="form-field mt-1"
                              maxLength={100}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <FieldLabel>Description</FieldLabel>
                            <AutoResizeTextarea
                              value={forumDraft.description}
                              onChange={(event) =>
                                updateForumDraft(
                                  forum.id,
                                  "description",
                                  event.target.value
                                )
                              }
                              rows={2}
                              maxLength={500}
                              className="form-field mt-1"
                              placeholder="Optional description for this subcategory"
                            />
                          </div>
                          <div>
                            <FieldLabel>URL name</FieldLabel>
                            <input
                              type="text"
                              value={forumDraft.slug}
                              onChange={(event) =>
                                updateForumDraft(
                                  forum.id,
                                  "slug",
                                  event.target.value.toLowerCase()
                                )
                              }
                              className="form-field mt-1 font-mono text-sm"
                              maxLength={120}
                            />
                          </div>
                          <div>
                            <FieldLabel>Sort order</FieldLabel>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={forumDraft.sortOrder}
                              onChange={(event) =>
                                updateForumDraft(
                                  forum.id,
                                  "sortOrder",
                                  Number(event.target.value)
                                )
                              }
                              className="form-field mt-1"
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/forums/${forum.id}/edit#access`}
                          className="min-h-9 inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg border border-border text-text-dark hover:bg-hover transition-colors"
                        >
                          Permissions
                        </Link>
                        <ActionButton
                          variant="primary"
                          onClick={() =>
                            runAction(`forum-save-${forum.id}`, async () => {
                              if (!forumDraft) {
                                return {
                                  success: false,
                                  error: "Missing subcategory data.",
                                };
                              }

                              const result = await updateForum(forum.id, {
                                categoryId: category.id,
                                name: forumDraft.name,
                                slug: forumDraft.slug,
                                description: forumDraft.description,
                                sortOrder: forumDraft.sortOrder,
                                isVisible: forum.isVisible,
                                isLocked: forum.isLocked,
                              });

                              if (result.success) {
                                setSuccess("Subcategory saved.");
                              }

                              return result;
                            })
                          }
                          disabled={pendingKey !== null}
                        >
                          Save Subcategory
                        </ActionButton>
                        <ActionButton
                          onClick={() =>
                            runAction(`forum-up-${forum.id}`, () =>
                              moveForumOrder(forum.id, "up")
                            )
                          }
                          disabled={pendingKey !== null || forumIndex === 0}
                        >
                          Move Up
                        </ActionButton>
                        <ActionButton
                          onClick={() =>
                            runAction(`forum-down-${forum.id}`, () =>
                              moveForumOrder(forum.id, "down")
                            )
                          }
                          disabled={
                            pendingKey !== null ||
                            forumIndex === category.forums.length - 1
                          }
                        >
                          Move Down
                        </ActionButton>
                        <ActionButton
                          onClick={() =>
                            runAction(`forum-vis-${forum.id}`, () =>
                              toggleForumVisibility(forum.id)
                            )
                          }
                          disabled={pendingKey !== null}
                        >
                          {forum.isVisible ? "Hide" : "Show"}
                        </ActionButton>
                        <ActionButton
                          onClick={() =>
                            runAction(`forum-lock-${forum.id}`, () =>
                              toggleForumLock(forum.id)
                            )
                          }
                          disabled={pendingKey !== null}
                        >
                          {forum.isLocked ? "Unlock" : "Lock"}
                        </ActionButton>
                        <ActionButton
                          variant="danger"
                          onClick={() =>
                            runAction(`forum-del-${forum.id}`, async () => {
                              if (
                                !window.confirm(
                                  `Delete subcategory "${forum.name}"?`
                                )
                              ) {
                                return { success: true };
                              }
                              return deleteForum(forum.id);
                            })
                          }
                          disabled={pendingKey !== null}
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-10 text-center text-sm text-text-secondary">
                No subcategories in this category yet.
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
