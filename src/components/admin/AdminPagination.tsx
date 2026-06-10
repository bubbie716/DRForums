import Link from "next/link";
import { cn } from "@/lib/utils";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string>;
};

export function AdminPagination({
  page,
  totalPages,
  basePath,
  searchParams = {},
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams({ ...searchParams, page: String(p) });
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-text-secondary">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          className={cn(
            "min-h-9 px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-hover transition-colors",
            page <= 1 && "pointer-events-none opacity-40"
          )}
        >
          Previous
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          className={cn(
            "min-h-9 px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-hover transition-colors",
            page >= totalPages && "pointer-events-none opacity-40"
          )}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
