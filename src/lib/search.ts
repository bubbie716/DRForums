import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { userHasAdminRole } from "@/lib/forumAccess";
import { getUsersDisplayRoles } from "@/lib/permissions";
import {
  buildSearchAccessContext,
  buildPostVisibilityFilter,
  buildThreadVisibilityFilter,
  filterVisiblePostResults,
  filterVisibleThreadResults,
  getSearchFilterOptions,
} from "@/lib/search/permissions";
import { buildSearchSnippet } from "@/lib/search/snippets";
import {
  SEARCH_ALL_USERS_LIMIT,
  SEARCH_PAGE_SIZE,
  type ParsedSearchInput,
  type PostSearchResult,
  type SearchPageData,
  type SearchResults,
  type ThreadSearchResult,
  type UserSearchResult,
} from "@/lib/search/types";
import { parseSearchParams } from "@/lib/search/validation";

export { parseSearchParams } from "@/lib/search/validation";
export type {
  ParsedSearchInput,
  PostSearchResult,
  SearchPageData,
  SearchResults,
  SearchType,
  ThreadSearchResult,
  UserSearchResult,
} from "@/lib/search/types";

type SearchContext = {
  userId: string | null;
  input: ParsedSearchInput;
  accessContext: Awaited<ReturnType<typeof buildSearchAccessContext>>;
};

function buildDateFilter(
  from?: Date,
  to?: Date
): Prisma.DateTimeFilter | undefined {
  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

function buildThreadTextFilter(query: string): Prisma.ThreadWhereInput {
  return {
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
      {
        author: {
          username: { contains: query, mode: "insensitive" },
        },
      },
    ],
  };
}

function buildPostTextFilter(query: string): Prisma.PostWhereInput {
  return {
    OR: [
      { content: { contains: query, mode: "insensitive" } },
      {
        author: {
          username: { contains: query, mode: "insensitive" },
        },
      },
    ],
  };
}

function threadOrderBy(
  sort: ParsedSearchInput["sort"]
): Prisma.ThreadOrderByWithRelationInput {
  if (sort === "oldest") {
    return { createdAt: "asc" };
  }

  return { createdAt: "desc" };
}

function postOrderBy(
  sort: ParsedSearchInput["sort"]
): Prisma.PostOrderByWithRelationInput {
  if (sort === "oldest") {
    return { createdAt: "asc" };
  }

  return { createdAt: "desc" };
}

const threadSelect = {
  id: true,
  title: true,
  content: true,
  viewCount: true,
  createdAt: true,
  forum: {
    select: {
      id: true,
      name: true,
      slug: true,
      category: {
        select: { id: true, name: true },
      },
    },
  },
  author: {
    select: {
      id: true,
      username: true,
      minecraftUsername: true,
      avatarUrl: true,
    },
  },
  _count: {
    select: { posts: true },
  },
} satisfies Prisma.ThreadSelect;

const postSelect = {
  id: true,
  content: true,
  createdAt: true,
  thread: {
    select: {
      id: true,
      title: true,
      forum: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: {
            select: { id: true, name: true },
          },
        },
      },
    },
  },
  author: {
    select: {
      id: true,
      username: true,
      minecraftUsername: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.PostSelect;

function mapThreadResult(
  thread: Prisma.ThreadGetPayload<{ select: typeof threadSelect }>,
  query: string
): ThreadSearchResult {
  const snippetSource =
    thread.title.toLowerCase().includes(query.toLowerCase()) ||
    !thread.content
      ? thread.title
      : thread.content;

  return {
    kind: "thread",
    id: thread.id,
    title: thread.title,
    snippet: buildSearchSnippet(snippetSource, query),
    forum: {
      id: thread.forum.id,
      name: thread.forum.name,
      slug: thread.forum.slug,
    },
    category: {
      id: thread.forum.category.id,
      name: thread.forum.category.name,
    },
    author: thread.author,
    replyCount: Math.max(0, thread._count.posts - 1),
    viewCount: thread.viewCount,
    createdAt: thread.createdAt,
    sortDate: thread.createdAt,
  };
}

function mapPostResult(
  post: Prisma.PostGetPayload<{ select: typeof postSelect }>,
  query: string
): PostSearchResult {
  return {
    kind: "post",
    id: post.id,
    content: post.content,
    snippet: buildSearchSnippet(post.content, query),
    thread: {
      id: post.thread.id,
      title: post.thread.title,
    },
    forum: {
      id: post.thread.forum.id,
      name: post.thread.forum.name,
      slug: post.thread.forum.slug,
    },
    category: {
      id: post.thread.forum.category.id,
      name: post.thread.forum.category.name,
    },
    author: post.author,
    createdAt: post.createdAt,
    sortDate: post.createdAt,
  };
}

async function createSearchContext(
  userId: string | null,
  input: ParsedSearchInput
): Promise<SearchContext> {
  const accessContext = await buildSearchAccessContext(userId, {
    includeHidden: input.includeHidden,
  });

  return { userId, input, accessContext };
}

export async function searchThreads(
  userId: string | null,
  input: ParsedSearchInput
): Promise<{ results: ThreadSearchResult[]; total: number }> {
  if (input.q.length < 2) {
    return { results: [], total: 0 };
  }

  const context = await createSearchContext(userId, input);
  const visibility = buildThreadVisibilityFilter(
    context.accessContext.forumAccess,
    userId,
    {
      forumId: input.forumId,
      categoryId: input.categoryId,
    }
  );

  if (!visibility) {
    return { results: [], total: 0 };
  }

  const dateFilter = buildDateFilter(input.from, input.to);
  const where: Prisma.ThreadWhereInput = {
    AND: [
      visibility,
      buildThreadTextFilter(input.q),
      ...(dateFilter ? [{ createdAt: dateFilter }] : []),
    ],
  };

  const [total, threads] = await Promise.all([
    prisma.thread.count({ where }),
    prisma.thread.findMany({
      where,
      select: threadSelect,
      orderBy: threadOrderBy(input.sort),
      skip: (input.page - 1) * SEARCH_PAGE_SIZE,
      take: SEARCH_PAGE_SIZE,
    }),
  ]);

  const mapped = threads.map((thread) => mapThreadResult(thread, input.q));
  const results = await filterVisibleThreadResults(userId, mapped);

  return { results, total };
}

export async function searchPosts(
  userId: string | null,
  input: ParsedSearchInput
): Promise<{ results: PostSearchResult[]; total: number }> {
  if (input.q.length < 2) {
    return { results: [], total: 0 };
  }

  const context = await createSearchContext(userId, input);
  const visibility = buildPostVisibilityFilter(
    context.accessContext.forumAccess,
    userId,
    {
      forumId: input.forumId,
      categoryId: input.categoryId,
    }
  );

  if (!visibility) {
    return { results: [], total: 0 };
  }

  const dateFilter = buildDateFilter(input.from, input.to);
  const where: Prisma.PostWhereInput = {
    AND: [
      visibility,
      buildPostTextFilter(input.q),
      ...(dateFilter ? [{ createdAt: dateFilter }] : []),
    ],
  };

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      select: postSelect,
      orderBy: postOrderBy(input.sort),
      skip: (input.page - 1) * SEARCH_PAGE_SIZE,
      take: SEARCH_PAGE_SIZE,
    }),
  ]);

  const mapped = posts.map((post) => mapPostResult(post, input.q));
  const results = await filterVisiblePostResults(userId, mapped);

  return { results, total };
}

export async function searchUsers(
  userId: string | null,
  input: ParsedSearchInput,
  limit = SEARCH_PAGE_SIZE
): Promise<{ results: UserSearchResult[]; total: number }> {
  if (input.q.length < 2) {
    return { results: [], total: 0 };
  }

  const normalizedUuid = input.q.replace(/-/g, "").toLowerCase();
  const looksLikeUuid =
    /^[0-9a-f]{32}$/i.test(normalizedUuid) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.q
    );

  const orFilters: Prisma.UserWhereInput[] = [
    { username: { contains: input.q, mode: "insensitive" } },
    { minecraftUsername: { contains: input.q, mode: "insensitive" } },
  ];

  if (looksLikeUuid) {
    orFilters.push({
      minecraftUuid: {
        contains: input.q,
        mode: "insensitive",
      },
    });
  }

  const where: Prisma.UserWhereInput = { OR: orFilters };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        minecraftUsername: true,
        minecraftUuid: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { username: "asc" },
      skip: (input.page - 1) * limit,
      take: limit,
    }),
  ]);

  const displayRoles = await getUsersDisplayRoles(users.map((user) => user.id));

  const results: UserSearchResult[] = users.map((user) => ({
    kind: "user",
    id: user.id,
    username: user.username,
    minecraftUsername: user.minecraftUsername,
    minecraftUuid: user.minecraftUuid,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    displayRole: displayRoles.get(user.id) ?? null,
  }));

  return { results, total };
}

function computeTotalPages(
  type: ParsedSearchInput["type"],
  totals: { threads: number; posts: number; users: number }
): number {
  if (type === "threads") {
    return Math.max(1, Math.ceil(totals.threads / SEARCH_PAGE_SIZE));
  }

  if (type === "posts") {
    return Math.max(1, Math.ceil(totals.posts / SEARCH_PAGE_SIZE));
  }

  if (type === "users") {
    return Math.max(1, Math.ceil(totals.users / SEARCH_PAGE_SIZE));
  }

  const combined = totals.threads + totals.posts;
  return Math.max(1, Math.ceil(combined / SEARCH_PAGE_SIZE));
}

async function fetchResultSlice<T>(
  total: number,
  skip: number,
  take: number,
  fetchPage: (page: number) => Promise<T[]>
): Promise<T[]> {
  const items: T[] = [];
  let remaining = take;
  let currentSkip = skip;

  while (remaining > 0 && currentSkip < total) {
    const page = Math.floor(currentSkip / SEARCH_PAGE_SIZE) + 1;
    const offset = currentSkip % SEARCH_PAGE_SIZE;
    const pageResults = await fetchPage(page);
    const slice = pageResults.slice(offset, offset + remaining);
    items.push(...slice);
    remaining -= slice.length;
    currentSkip += slice.length;

    if (slice.length === 0) {
      break;
    }
  }

  return items;
}

async function searchAllCombined(
  userId: string | null,
  input: ParsedSearchInput
): Promise<{
  threads: ThreadSearchResult[];
  posts: PostSearchResult[];
  users: UserSearchResult[];
  totalThreads: number;
  totalPosts: number;
  totalUsers: number;
}> {
  const [threadMeta, postMeta, userData] = await Promise.all([
    searchThreads(userId, { ...input, page: 1, type: "threads" }),
    searchPosts(userId, { ...input, page: 1, type: "posts" }),
    input.page === 1
      ? searchUsers(
          userId,
          { ...input, page: 1, type: "users" },
          SEARCH_ALL_USERS_LIMIT
        )
      : Promise.resolve({ results: [], total: 0 }),
  ]);

  const skip = (input.page - 1) * SEARCH_PAGE_SIZE;
  const threads: ThreadSearchResult[] = [];
  const posts: PostSearchResult[] = [];

  if (skip < threadMeta.total) {
    const threadTake = Math.min(SEARCH_PAGE_SIZE, threadMeta.total - skip);
    threads.push(
      ...(await fetchResultSlice(
        threadMeta.total,
        skip,
        threadTake,
        async (page) =>
          (
            await searchThreads(userId, {
              ...input,
              type: "threads",
              page,
            })
          ).results
      ))
    );
  }

  const remaining = SEARCH_PAGE_SIZE - threads.length;
  if (remaining > 0) {
    const postSkip = Math.max(0, skip - threadMeta.total);
    posts.push(
      ...(await fetchResultSlice(
        postMeta.total,
        postSkip,
        remaining,
        async (page) =>
          (
            await searchPosts(userId, {
              ...input,
              type: "posts",
              page,
            })
          ).results
      ))
    );
  }

  return {
    threads,
    posts,
    users: userData.results,
    totalThreads: threadMeta.total,
    totalPosts: postMeta.total,
    totalUsers: userData.total,
  };
}

export async function searchEverything(
  userId: string | null,
  input: ParsedSearchInput
): Promise<SearchResults> {
  if (input.q.length < 2) {
    return {
      query: input.q,
      type: input.type,
      sort: input.sort,
      page: input.page,
      pageSize: SEARCH_PAGE_SIZE,
      threads: [],
      posts: [],
      users: [],
      totalThreads: 0,
      totalPosts: 0,
      totalUsers: 0,
      totalPages: 1,
    };
  }

  if (input.type === "threads") {
    const { results, total } = await searchThreads(userId, input);
    return {
      query: input.q,
      type: input.type,
      sort: input.sort,
      page: input.page,
      pageSize: SEARCH_PAGE_SIZE,
      threads: results,
      posts: [],
      users: [],
      totalThreads: total,
      totalPosts: 0,
      totalUsers: 0,
      totalPages: computeTotalPages("threads", {
        threads: total,
        posts: 0,
        users: 0,
      }),
    };
  }

  if (input.type === "posts") {
    const { results, total } = await searchPosts(userId, input);
    return {
      query: input.q,
      type: input.type,
      sort: input.sort,
      page: input.page,
      pageSize: SEARCH_PAGE_SIZE,
      threads: [],
      posts: results,
      users: [],
      totalThreads: 0,
      totalPosts: total,
      totalUsers: 0,
      totalPages: computeTotalPages("posts", {
        threads: 0,
        posts: total,
        users: 0,
      }),
    };
  }

  if (input.type === "users") {
    const { results, total } = await searchUsers(userId, input);
    return {
      query: input.q,
      type: input.type,
      sort: input.sort,
      page: input.page,
      pageSize: SEARCH_PAGE_SIZE,
      threads: [],
      posts: [],
      users: results,
      totalThreads: 0,
      totalPosts: 0,
      totalUsers: total,
      totalPages: computeTotalPages("users", {
        threads: 0,
        posts: 0,
        users: total,
      }),
    };
  }

  const combined = await searchAllCombined(userId, input);

  return {
    query: input.q,
    type: input.type,
    sort: input.sort,
    page: input.page,
    pageSize: SEARCH_PAGE_SIZE,
    threads: combined.threads,
    posts: combined.posts,
    users: combined.users,
    totalThreads: combined.totalThreads,
    totalPosts: combined.totalPosts,
    totalUsers: combined.totalUsers,
    totalPages: computeTotalPages("all", {
      threads: combined.totalThreads,
      posts: combined.totalPosts,
      users: combined.totalUsers,
    }),
  };
}

export async function getSearchPageData(
  userId: string | null,
  rawParams: Parameters<typeof parseSearchParams>[0]
): Promise<
  | { success: true; data: SearchPageData }
  | { success: false; error: string }
> {
  const canIncludeHidden = userId ? await userHasAdminRole(userId) : false;
  const parsed = parseSearchParams(rawParams, { allowIncludeHidden: canIncludeHidden });

  if (!parsed.success) {
    return parsed;
  }

  const accessContext = await buildSearchAccessContext(userId, {
    includeHidden: parsed.data.includeHidden,
  });
  const { forums, categories } = getSearchFilterOptions(accessContext);
  const results = await searchEverything(userId, parsed.data);

  return {
    success: true,
    data: {
      ...results,
      forums,
      categories,
      canIncludeHidden,
      includeHidden: parsed.data.includeHidden,
    },
  };
}

export async function filterVisibleResults<
  T extends ThreadSearchResult | PostSearchResult,
>(userId: string | null, results: T[]): Promise<T[]> {
  if (results.length === 0) {
    return [];
  }

  if (results[0].kind === "thread") {
    return (await filterVisibleThreadResults(
      userId,
      results as ThreadSearchResult[]
    )) as T[];
  }

  return (await filterVisiblePostResults(
    userId,
    results as PostSearchResult[]
  )) as T[];
}
