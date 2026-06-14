import { prisma } from "@/lib/prisma";
import { calculateReactionRatioFromPostReactions } from "@/lib/forum/reactions";
import { canViewThread, getForumAccessMap } from "@/lib/forumAccess";
import {
  buildPostVisibilityFilter,
  buildSearchAccessContext,
  buildThreadVisibilityFilter,
} from "@/lib/search/permissions";
import { withDisplayRole } from "@/lib/display-role";
import { getUserDisplayRole, getUsersDisplayRoles } from "@/lib/permissions";

export type LatestPost = {
  id: string;
  createdAt: Date;
  thread: {
    id: string;
    title: string;
  };
  author: {
    username: string;
  };
};

export type ForumWithStats = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  threadCount: number;
  postCount: number;
  latestPost: LatestPost | null;
};

export type CategoryWithForums = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  forums: ForumWithStats[];
};

type ForumIndexOptions = {
  includeHidden?: boolean;
  userId?: string | null;
};

export async function getForumIndex(
  options: ForumIndexOptions = {}
): Promise<CategoryWithForums[]> {
  const { includeHidden = false, userId = null } = options;

  const categories = await prisma.category.findMany({
    where: includeHidden ? undefined : { isVisible: true },
    orderBy: { sortOrder: "asc" },
    include: {
      forums: {
        where: includeHidden ? undefined : { isVisible: true },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { threads: true },
          },
        },
      },
    },
  });

  const forumIds = categories.flatMap((category) =>
    category.forums.map((forum) => forum.id)
  );

  if (forumIds.length === 0) {
    return categories.map((category) => ({
      ...category,
      forums: [],
    }));
  }

  const threads = await prisma.thread.findMany({
    where: { forumId: { in: forumIds } },
    select: {
      forumId: true,
      _count: { select: { posts: true } },
    },
  });

  const postCountMap = new Map<string, number>();
  for (const thread of threads) {
    postCountMap.set(
      thread.forumId,
      (postCountMap.get(thread.forumId) ?? 0) + thread._count.posts
    );
  }

  const recentPosts = await prisma.post.findMany({
    where: { thread: { forumId: { in: forumIds } } },
    orderBy: { createdAt: "desc" },
    take: Math.max(forumIds.length * 2, 50),
    select: {
      id: true,
      createdAt: true,
      thread: {
        select: {
          id: true,
          title: true,
          forumId: true,
        },
      },
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  const latestPostMap = new Map<string, LatestPost>();
  for (const post of recentPosts) {
    const forumId = post.thread.forumId;
    if (latestPostMap.has(forumId)) {
      continue;
    }

    latestPostMap.set(forumId, {
      id: post.id,
      createdAt: post.createdAt,
      thread: {
        id: post.thread.id,
        title: post.thread.title,
      },
      author: {
        username: post.author.username,
      },
    });
  }

  const accessMap = includeHidden
    ? null
    : await getForumAccessMap(
        userId,
        forumIds
      );

  const filteredCategories = categories
    .map((category) => {
      const forums = category.forums
        .filter((forum) => {
          if (includeHidden) {
            return true;
          }
          return accessMap?.get(forum.id)?.canView ?? false;
        })
        .map((forum) => ({
          id: forum.id,
          name: forum.name,
          slug: forum.slug,
          description: forum.description,
          sortOrder: forum.sortOrder,
          categoryId: forum.categoryId,
          createdAt: forum.createdAt,
          updatedAt: forum.updatedAt,
          threadCount: forum._count.threads,
          postCount: postCountMap.get(forum.id) ?? 0,
          latestPost: latestPostMap.get(forum.id) ?? null,
        }));

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        forums,
      };
    })
    .filter((category) => includeHidden || category.forums.length > 0);

  if (includeHidden) {
    return filteredCategories;
  }

  const visibleLatestPosts = await Promise.all(
    filteredCategories.flatMap((category) =>
      category.forums
        .filter((forum) => forum.latestPost)
        .map(async (forum) => {
          const post = forum.latestPost!;
          const allowed = await canViewThread(userId, post.thread.id);
          return {
            forumId: forum.id,
            post: allowed ? post : null,
          };
        })
    )
  );

  const visibleLatestMap = new Map(
    visibleLatestPosts.map((entry) => [entry.forumId, entry.post])
  );

  return filteredCategories.map((category) => ({
    ...category,
    forums: category.forums.map((forum) => ({
      ...forum,
      latestPost: forum.latestPost
        ? (visibleLatestMap.get(forum.id) ?? null)
        : null,
    })),
  }));
}

export async function getForumBySlug(
  slug: string,
  options: { includeHidden?: boolean } = {}
) {
  const forum = await prisma.forum.findUnique({
    where: { slug },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          isVisible: true,
        },
      },
    },
  });

  if (!forum) {
    return null;
  }

  if (
    !options.includeHidden &&
    (!forum.isVisible || !forum.category.isVisible)
  ) {
    return null;
  }

  return forum;
}

export async function getForumThreads(
  forumId: string,
  userId: string | null = null
) {
  const accessMap = await getForumAccessMap(userId, [forumId]);
  const access = accessMap.get(forumId);

  const ownThreadsOnly =
    access && !access.canViewOtherThreads && !access.canModerate;

  if (ownThreadsOnly && !userId) {
    return [];
  }

  const threadFilter = ownThreadsOnly
    ? { forumId, authorId: userId! }
    : { forumId };

  const threads = await prisma.thread.findMany({
    where: threadFilter,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          minecraftUsername: true,
        },
      },
      _count: {
        select: { posts: true },
      },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          createdAt: true,
          author: {
            select: { username: true },
          },
        },
      },
    },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });

  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    slug: thread.slug,
    isPinned: thread.isPinned,
    isLocked: thread.isLocked,
    viewCount: thread.viewCount,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    author: thread.author,
    replyCount: Math.max(0, thread._count.posts - 1),
    latestReply: thread.posts[0] ?? null,
  }));
}

export async function getThreadById(id: string) {
  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          createdAt: true,
          minecraftUsername: true,
        },
      },
      forum: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      posts: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              createdAt: true,
              minecraftUsername: true,
            },
          },
          reactions: {
            select: {
              type: true,
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!thread) {
    return null;
  }

  const authorIds = [
    thread.author.id,
    ...thread.posts.map((post) => post.author.id),
  ];
  const displayRoles = await getUsersDisplayRoles(authorIds);

  return {
    ...thread,
    author: withDisplayRole(thread.author, displayRoles),
    posts: thread.posts.map((post) => ({
      ...post,
      author: withDisplayRole(post.author, displayRoles),
    })),
  };
}

export async function getPublicProfile(
  username: string,
  viewerId: string | null = null
) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      minecraftUsername: true,
    },
  });

  if (!user) {
    return null;
  }

  const [recentPosts, reactionRatio, displayRole, activityCounts] =
    await Promise.all([
      getUserRecentPosts(user.id, 15, viewerId),
      getUserReactionRatio(user.id),
      getUserDisplayRole(user.id),
      getProfileVisibleActivityCounts(user.id, viewerId),
    ]);

  return {
    ...user,
    _count: activityCounts,
    displayRole: displayRole
      ? { name: displayRole.name, color: displayRole.color }
      : null,
    recentPosts,
    reactionRatio,
  };
}

async function getProfileVisibleActivityCounts(
  userId: string,
  viewerId: string | null
) {
  const context = await buildSearchAccessContext(viewerId, {});
  const threadFilter = buildThreadVisibilityFilter(
    context.forumAccess,
    viewerId
  );
  const postFilter = buildPostVisibilityFilter(context.forumAccess, viewerId);

  if (!threadFilter || !postFilter) {
    return { threads: 0, posts: 0 };
  }

  const [threads, posts] = await Promise.all([
    prisma.thread.count({
      where: {
        AND: [{ authorId: userId }, threadFilter],
      },
    }),
    prisma.post.count({
      where: {
        AND: [{ authorId: userId }, postFilter],
      },
    }),
  ]);

  return { threads, posts };
}

/** Profile reaction ratio from forum posts only; DM message reactions are excluded. */
export async function getUserReactionRatio(userId: string): Promise<number> {
  const postReactions = await prisma.postReaction.findMany({
    where: {
      post: { authorId: userId },
      userId: { not: userId },
    },
    select: { type: true, postId: true, userId: true },
  });

  return calculateReactionRatioFromPostReactions(postReactions);
}

const PROFILE_RECENT_POSTS_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export async function getUserRecentPosts(
  userId: string,
  limit = 15,
  viewerId: string | null = userId
) {
  const createdAfter = new Date(Date.now() - PROFILE_RECENT_POSTS_MAX_AGE_MS);

  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      createdAt: { gte: createdAfter },
    },
    orderBy: { createdAt: "desc" },
    take: limit * 3,
    select: {
      id: true,
      content: true,
      createdAt: true,
      thread: {
        select: {
          id: true,
          title: true,
          forum: {
            select: {
              name: true,
              slug: true,
            },
          },
          posts: {
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  const visiblePosts = [];

  for (const post of posts) {
    const allowed = await canViewThread(viewerId, post.thread.id);
    if (!allowed) {
      continue;
    }

    visiblePosts.push({
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      isOriginalPost: post.id === post.thread.posts[0]?.id,
      thread: {
        id: post.thread.id,
        title: post.thread.title,
        forum: post.thread.forum,
      },
    });

    if (visiblePosts.length >= limit) {
      break;
    }
  }

  return visiblePosts;
}

export type ForumIndexCategory = CategoryWithForums;
export type ForumIndexForum = ForumWithStats;
export type ForumThreadRow = Awaited<ReturnType<typeof getForumThreads>>[number];
export type ThreadDetail = NonNullable<Awaited<ReturnType<typeof getThreadById>>>;
export type UserRecentPost = Awaited<
  ReturnType<typeof getUserRecentPosts>
>[number];
