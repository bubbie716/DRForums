import type { Prisma } from "@prisma/client";
import {
  getForumAccessMap,
  userHasAdminRole,
} from "@/lib/forumAccess";
import { prisma } from "@/lib/prisma";
import type {
  PostSearchResult,
  SearchCategoryOption,
  SearchForumOption,
  ThreadSearchResult,
} from "@/lib/search/types";

export type SearchForumAccess = {
  forumId: string;
  categoryId: string;
  canViewOtherThreads: boolean;
  canModerate: boolean;
};

export type SearchAccessContext = {
  forumAccess: SearchForumAccess[];
  forumMap: Map<string, SearchForumOption>;
  categoryMap: Map<string, SearchCategoryOption>;
};

export async function buildSearchAccessContext(
  userId: string | null,
  options: { includeHidden?: boolean } = {}
): Promise<SearchAccessContext> {
  const includeHidden = Boolean(options.includeHidden && userId);

  if (includeHidden && userId && !(await userHasAdminRole(userId))) {
    return {
      forumAccess: [],
      forumMap: new Map(),
      categoryMap: new Map(),
    };
  }

  const categories = await prisma.category.findMany({
    where: includeHidden ? undefined : { isVisible: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      forums: {
        where: includeHidden ? undefined : { isVisible: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
        },
      },
    },
  });

  const forumMap = new Map<string, SearchForumOption>();
  const categoryMap = new Map<string, SearchCategoryOption>();
  const forumIds: string[] = [];

  for (const category of categories) {
    categoryMap.set(category.id, { id: category.id, name: category.name });
    for (const forum of category.forums) {
      forumIds.push(forum.id);
      forumMap.set(forum.id, {
        id: forum.id,
        name: forum.name,
        slug: forum.slug,
        categoryId: category.id,
        categoryName: category.name,
      });
    }
  }

  const accessMap = await getForumAccessMap(userId, forumIds);
  const forumAccess: SearchForumAccess[] = [];

  for (const forumId of forumIds) {
    const access = accessMap.get(forumId);
    const forum = forumMap.get(forumId);
    if (!access?.canView || !access.canRead || !forum) {
      continue;
    }

    forumAccess.push({
      forumId,
      categoryId: forum.categoryId,
      canViewOtherThreads: access.canViewOtherThreads,
      canModerate: access.canModerate,
    });
  }

  return { forumAccess, forumMap, categoryMap };
}

export function buildThreadVisibilityFilter(
  forumAccess: SearchForumAccess[],
  userId: string | null,
  filters: { forumId?: string; categoryId?: string } = {}
): Prisma.ThreadWhereInput | null {
  let entries = forumAccess;

  if (filters.forumId) {
    entries = entries.filter((entry) => entry.forumId === filters.forumId);
  }

  if (filters.categoryId) {
    entries = entries.filter(
      (entry) => entry.categoryId === filters.categoryId
    );
  }

  const or: Prisma.ThreadWhereInput[] = [];

  for (const entry of entries) {
    if (entry.canViewOtherThreads || entry.canModerate) {
      or.push({ forumId: entry.forumId });
      continue;
    }

    if (userId) {
      or.push({ forumId: entry.forumId, authorId: userId });
    }
  }

  if (or.length === 0) {
    return null;
  }

  return { OR: or };
}

export function buildPostVisibilityFilter(
  forumAccess: SearchForumAccess[],
  userId: string | null,
  filters: { forumId?: string; categoryId?: string } = {}
): Prisma.PostWhereInput | null {
  const threadFilter = buildThreadVisibilityFilter(
    forumAccess,
    userId,
    filters
  );

  if (!threadFilter) {
    return null;
  }

  const ownOnlyForumIds = new Set(
    forumAccess
      .filter(
        (entry) =>
          !entry.canViewOtherThreads &&
          !entry.canModerate &&
          (!filters.forumId || entry.forumId === filters.forumId) &&
          (!filters.categoryId || entry.categoryId === filters.categoryId)
      )
      .map((entry) => entry.forumId)
  );

  if (!userId || ownOnlyForumIds.size === 0) {
    return { thread: threadFilter };
  }

  const fullAccessFilter = buildThreadVisibilityFilter(
    forumAccess.filter(
      (entry) => entry.canViewOtherThreads || entry.canModerate
    ),
    userId,
    filters
  );

  const ownPostClauses: Prisma.PostWhereInput[] = Array.from(
    ownOnlyForumIds
  ).map((forumId) => ({
    authorId: userId,
    thread: { forumId },
  }));

  if (fullAccessFilter) {
    return {
      OR: [{ thread: fullAccessFilter }, ...ownPostClauses],
    };
  }

  return { OR: ownPostClauses };
}

export async function filterVisibleThreadResults(
  userId: string | null,
  results: ThreadSearchResult[]
): Promise<ThreadSearchResult[]> {
  if (results.length === 0) {
    return [];
  }

  const threadIds = results.map((result) => result.id);
  const threads = await prisma.thread.findMany({
      where: { id: { in: threadIds } },
      select: { id: true, authorId: true, forumId: true },
    });

  const forumIds = [...new Set(threads.map((thread) => thread.forumId))];
  const accessMap = await getForumAccessMap(userId, forumIds);
  const threadMap = new Map(threads.map((thread) => [thread.id, thread]));

  return results.filter((result) => {
    const thread = threadMap.get(result.id);
    if (!thread) {
      return false;
    }

    const access = accessMap.get(thread.forumId);
    if (!access?.canView || !access.canRead) {
      return false;
    }

    if (access.canViewOtherThreads || access.canModerate) {
      return true;
    }

    return userId !== null && thread.authorId === userId;
  });
}

export async function filterVisiblePostResults(
  userId: string | null,
  results: PostSearchResult[]
): Promise<PostSearchResult[]> {
  if (results.length === 0) {
    return [];
  }

  const threadIds = [...new Set(results.map((result) => result.thread.id))];
  const threads = await prisma.thread.findMany({
      where: { id: { in: threadIds } },
      select: { id: true, authorId: true, forumId: true },
    });

  const forumIds = [...new Set(threads.map((thread) => thread.forumId))];
  const accessMap = await getForumAccessMap(userId, forumIds);
  const threadMap = new Map(threads.map((thread) => [thread.id, thread]));

  return results.filter((result) => {
    const thread = threadMap.get(result.thread.id);
    if (!thread) {
      return false;
    }

    const access = accessMap.get(thread.forumId);
    if (!access?.canView || !access.canRead) {
      return false;
    }

    if (access.canViewOtherThreads || access.canModerate) {
      return true;
    }

    return userId !== null && thread.authorId === userId;
  });
}

export function getSearchFilterOptions(context: SearchAccessContext): {
  forums: SearchForumOption[];
  categories: SearchCategoryOption[];
} {
  const forums = Array.from(context.forumMap.values()).sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name)
  );

  const categories = Array.from(context.categoryMap.values());

  return { forums, categories };
}
