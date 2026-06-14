import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { getSearchPageData } from "@/lib/search";
import type { RawSearchParams } from "@/lib/search/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResults } from "@/components/search/SearchResults";

export const metadata: Metadata = {
  title: "Search",
};

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    sort?: string;
    page?: string;
    forum?: string;
    category?: string;
    from?: string;
    to?: string;
    hidden?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const user = await getSessionUser();
  const query = (params.q ?? "").trim();

  if (query.length >= 2) {
    const headersList = await headers();
    const ip = getClientIp(headersList);
    const rateLimitKey = user ? `search:${user.id}:${ip}` : `search:${ip}`;
    const rateLimit = checkRateLimit({
      key: rateLimitKey,
      limit: 30,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return (
        <div className="bg-surface min-h-full">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
            <Breadcrumbs
              items={[
                { label: "Forums", href: "/" },
                { label: "Search" },
              ]}
            />
            <div className="mt-6 bg-white border border-border rounded-2xl shadow-warm p-8 text-center">
              <h1 className="text-2xl font-extrabold text-text-dark">Search</h1>
              <p className="text-text-secondary mt-3">
                Too many attempts. Please try again later.
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  const result = await getSearchPageData(
    user?.id ?? null,
    params as RawSearchParams
  );

  if (!result.success) {
    return (
      <div className="bg-surface min-h-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
          <Breadcrumbs
            items={[
              { label: "Forums", href: "/" },
              { label: "Search" },
            ]}
          />
          <div className="mt-6 bg-white border border-border rounded-2xl shadow-warm p-8 text-center">
            <h1 className="text-2xl font-extrabold text-text-dark">Search</h1>
            <p className="text-text-secondary mt-3">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { data } = result;
  const urlParams = {
    q: data.query || undefined,
    type: data.type === "all" ? undefined : data.type,
    sort: data.sort === "relevance" ? undefined : data.sort,
    forum: params.forum,
    category: params.category,
    from: params.from,
    to: params.to,
    hidden: data.includeHidden ? "1" : undefined,
    page: data.page > 1 ? String(data.page) : undefined,
  };

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Forums", href: "/" },
            { label: "Search" },
          ]}
        />

        <div className="mt-6 space-y-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-text-dark">
              Search
            </h1>
            <p className="text-text-secondary mt-2">
              Find threads, posts, and community members across District
              Roleplay.
            </p>
          </div>

          <Suspense fallback={null}>
            <SearchFilters
              query={data.query}
              type={data.type}
              sort={data.sort}
              page={data.page}
              forumId={params.forum}
              categoryId={params.category}
              from={params.from}
              to={params.to}
              includeHidden={data.includeHidden}
              canIncludeHidden={data.canIncludeHidden}
              forums={data.forums}
              categories={data.categories}
            />
          </Suspense>

          <SearchResults data={data} urlParams={urlParams} />
        </div>
      </div>
    </div>
  );
}
