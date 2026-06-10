import { prisma } from "@/lib/prisma";
import { calculateReactionRatioFromReactions } from "@/lib/forum/reactions";

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

export async function getForumIndex(): Promise<CategoryWithForums[]> {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      forums: {
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

  const latestPostResults = await Promise.all(
    forumIds.map(async (forumId) => {
      const post = await prisma.post.findFirst({
        where: { thread: { forumId } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          thread: {
            select: {
              id: true,
              title: true,
            },
          },
          author: {
            select: {
              username: true,
            },
          },
        },
      });

      return { forumId, post };
    })
  );

  const latestPostMap = new Map(
    latestPostResults.map(({ forumId, post }) => [forumId, post])
  );

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    forums: category.forums.map((forum) => ({
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
    })),
  }));
}

export async function getForumBySlug(slug: string) {
  return prisma.forum.findUnique({
    where: { slug },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getForumThreads(forumId: string) {
  const threads = await prisma.thread.findMany({
    where: { forumId },
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
  return prisma.thread.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          role: true,
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
              role: true,
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
}

export async function getPublicProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      minecraftUsername: true,
      _count: {
        select: {
          threads: true,
          posts: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const [recentPosts, reactionRatio] = await Promise.all([
    getUserRecentPosts(user.id),
    getUserReactionRatio(user.id),
  ]);

  return {
    ...user,
    recentPosts,
    reactionRatio,
  };
}

export async function getUserReactionRatio(userId: string): Promise<number> {
  const reactions = await prisma.postReaction.findMany({
    where: {
      post: { authorId: userId },
      userId: { not: userId },
    },
    select: { type: true, postId: true, userId: true },
  });

  return calculateReactionRatioFromReactions(reactions);
}

export async function getUserRecentPosts(userId: string, limit = 15) {
  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
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

  return posts.map((post) => ({
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    isOriginalPost: post.id === post.thread.posts[0]?.id,
    thread: {
      id: post.thread.id,
      title: post.thread.title,
      forum: post.thread.forum,
    },
  }));
}

export type ForumIndexCategory = CategoryWithForums;
export type ForumIndexForum = ForumWithStats;
export type ForumThreadRow = Awaited<ReturnType<typeof getForumThreads>>[number];
export type ThreadDetail = NonNullable<Awaited<ReturnType<typeof getThreadById>>>;
export type UserRecentPost = Awaited<
  ReturnType<typeof getUserRecentPosts>
>[number];
