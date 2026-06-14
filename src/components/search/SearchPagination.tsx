import Link from "next/link";
import { cn } from "@/lib/utils";

type SearchPaginationProps = {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
};

export function SearchPagination({
  page,
  totalPages,
  searchParams,
}: SearchPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") {
        params.set(key, value);
      }
    }

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }

    const queryString = params.toString();
    return queryString ? `/search?${queryString}` : "/search";
  }

  return (
    <div className="flex items-center justify-between gap-4 pt-6">
      <p className="text-sm text-text-secondary">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          className={cn(
            "min-h-9 px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-white hover:bg-hover transition-colors",
            page <= 1 && "pointer-events-none opacity-40"
          )}
        >
          Previous
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          className={cn(
            "min-h-9 px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-white hover:bg-hover transition-colors",
            page >= totalPages && "pointer-events-none opacity-40"
          )}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
