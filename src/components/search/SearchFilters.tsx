"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo } from "react";
import type {
  SearchCategoryOption,
  SearchForumOption,
  SearchSort,
  SearchType,
} from "@/lib/search/types";
import { formInputClassName } from "@/components/ui/fieldStyles";
import { cn } from "@/lib/utils";

type SearchFiltersProps = {
  query: string;
  type: SearchType;
  sort: SearchSort;
  page: number;
  forumId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  includeHidden: boolean;
  canIncludeHidden: boolean;
  forums: SearchForumOption[];
  categories: SearchCategoryOption[];
};

const TYPE_OPTIONS: { value: SearchType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "threads", label: "Threads" },
  { value: "posts", label: "Posts" },
  { value: "users", label: "Users" },
];

const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

function buildSearchHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value.length > 0) {
      search.set(key, value);
    }
  }

  const queryString = search.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

export function SearchFilters({
  query,
  type,
  sort,
  page,
  forumId,
  categoryId,
  from,
  to,
  includeHidden,
  canIncludeHidden,
  forums,
  categories,
}: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const baseParams = useMemo(
    () => ({
      q: query,
      type,
      sort,
      forum: forumId,
      category: categoryId,
      from,
      to,
      hidden: includeHidden ? "1" : undefined,
      page: page > 1 ? String(page) : undefined,
    }),
    [query, type, sort, forumId, categoryId, from, to, includeHidden, page]
  );

  function updateParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(searchParams.toString());

    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    next.delete("page");
    router.push(`/search?${next.toString()}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("q") ?? "").trim();

    if (nextQuery.length < 2) {
      return;
    }

    const next = new URLSearchParams(searchParams.toString());
    next.set("q", nextQuery);
    next.delete("page");
    router.push(`/search?${next.toString()}`);
  }

  const filteredForums = categoryId
    ? forums.filter((forum) => forum.categoryId === categoryId)
    : forums;

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search threads, posts, and users…"
          maxLength={100}
          className="w-full min-h-12 px-4 py-3 pr-28 text-base bg-white border border-border rounded-2xl text-text-dark placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 shadow-warm"
          aria-label="Search query"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 min-h-9 px-5 text-sm font-bold bg-gradient-orange text-white rounded-xl hover:shadow-warm-lg transition-all duration-200"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={buildSearchHref({
              ...baseParams,
              type: option.value === "all" ? undefined : option.value,
              page: undefined,
            })}
            className={cn(
              "min-h-9 px-4 py-2 text-sm font-semibold rounded-xl border transition-all duration-200",
              type === option.value
                ? "bg-accent text-white border-accent shadow-warm"
                : "bg-white text-text-dark border-border hover:bg-hover"
            )}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <div className="bg-white border border-border rounded-2xl shadow-warm p-4 md:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Category
            </span>
            <select
              value={categoryId ?? ""}
              onChange={(event) =>
                updateParam("category", event.target.value || undefined)
              }
              className={cn(formInputClassName, "min-h-10 py-2 text-sm")}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Forum
            </span>
            <select
              value={forumId ?? ""}
              onChange={(event) =>
                updateParam("forum", event.target.value || undefined)
              }
              className={cn(formInputClassName, "min-h-10 py-2 text-sm")}
            >
              <option value="">All forums</option>
              {filteredForums.map((forum) => (
                <option key={forum.id} value={forum.id}>
                  {forum.categoryName} / {forum.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Sort
            </span>
            <select
              value={sort}
              onChange={(event) => updateParam("sort", event.target.value)}
              className={cn(formInputClassName, "min-h-10 py-2 text-sm")}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              From
            </span>
            <input
              type="date"
              value={from ?? ""}
              onChange={(event) =>
                updateParam("from", event.target.value || undefined)
              }
              className={cn(formInputClassName, "min-h-10 py-2 text-sm")}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              To
            </span>
            <input
              type="date"
              value={to ?? ""}
              onChange={(event) =>
                updateParam("to", event.target.value || undefined)
              }
              className={cn(formInputClassName, "min-h-10 py-2 text-sm")}
            />
          </label>
        </div>

        {canIncludeHidden && (
          <label className="mt-4 flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHidden}
              onChange={(event) =>
                updateParam("hidden", event.target.checked ? "1" : undefined)
              }
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30"
            />
            <span className="text-sm font-medium text-text-dark">
              Include hidden forums
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
