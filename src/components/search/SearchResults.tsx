import type { ReactNode } from "react";
import type { SearchPageData } from "@/lib/search/types";
import {
  PostSearchResultCard,
  ThreadSearchResultCard,
  UserSearchResultCard,
} from "./SearchResultCards";
import { SearchPagination } from "./SearchPagination";

type SearchResultsProps = {
  data: SearchPageData;
  urlParams: Record<string, string | undefined>;
};

function EmptySearchState({ query }: { query: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl shadow-warm p-10 text-center">
      <h2 className="text-xl font-bold text-text-dark">No results found.</h2>
      {query.length >= 2 ? (
        <p className="text-text-secondary mt-2">
          Nothing matched &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <p className="text-text-secondary mt-2">
          Enter at least 2 characters to search.
        </p>
      )}
      <ul className="mt-6 text-sm text-text-secondary space-y-2">
        <li>Try different keywords</li>
        <li>Check your spelling</li>
        <li>Broaden your search</li>
      </ul>
    </div>
  );
}

function ResultSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          {title}
        </h2>
        <span className="text-xs font-semibold text-text-secondary tabular-nums">
          {count} result{count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function SearchResults({ data, urlParams }: SearchResultsProps) {
  const hasThreads = data.threads.length > 0;
  const hasPosts = data.posts.length > 0;
  const hasUsers = data.users.length > 0;
  const hasAnyResults = hasThreads || hasPosts || hasUsers;

  if (data.query.length < 2) {
    return (
      <EmptySearchState query={data.query} />
    );
  }

  if (!hasAnyResults) {
    return <EmptySearchState query={data.query} />;
  }

  const showThreads =
    data.type === "all" || data.type === "threads" ? hasThreads : false;
  const showPosts =
    data.type === "all" || data.type === "posts" ? hasPosts : false;
  const showUsers =
    data.type === "all" || data.type === "users" ? hasUsers : false;

  const summaryParts: string[] = [];
  if (data.type === "all" || data.type === "threads") {
    if (data.totalThreads > 0) {
      summaryParts.push(
        `${data.totalThreads} thread${data.totalThreads === 1 ? "" : "s"}`
      );
    }
  }
  if (data.type === "all" || data.type === "posts") {
    if (data.totalPosts > 0) {
      summaryParts.push(
        `${data.totalPosts} post${data.totalPosts === 1 ? "" : "s"}`
      );
    }
  }
  if (data.type === "all" || data.type === "users") {
    if (data.totalUsers > 0) {
      summaryParts.push(
        `${data.totalUsers} user${data.totalUsers === 1 ? "" : "s"}`
      );
    }
  }

  return (
    <div className="space-y-8">
      {summaryParts.length > 0 && (
        <p className="text-sm text-text-secondary">
          Found {summaryParts.join(", ")} for &ldquo;{data.query}&rdquo;
        </p>
      )}

      {showUsers && (
        <ResultSection title="Users" count={data.users.length}>
          {data.users.map((result) => (
            <UserSearchResultCard key={result.id} result={result} />
          ))}
        </ResultSection>
      )}

      {showThreads && (
        <ResultSection title="Threads" count={data.threads.length}>
          {data.threads.map((result) => (
            <ThreadSearchResultCard
              key={result.id}
              result={result}
              query={data.query}
            />
          ))}
        </ResultSection>
      )}

      {showPosts && (
        <ResultSection title="Posts" count={data.posts.length}>
          {data.posts.map((result) => (
            <PostSearchResultCard
              key={result.id}
              result={result}
              query={data.query}
            />
          ))}
        </ResultSection>
      )}

      <SearchPagination
        page={data.page}
        totalPages={data.totalPages}
        searchParams={urlParams}
      />
    </div>
  );
}
