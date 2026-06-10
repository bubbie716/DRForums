import { prisma } from "@/lib/prisma";
import type { Prisma, Role } from "@prisma/client";

const PAGE_SIZE = 20;

export type UserListFilters = {
  q?: string;
  role?: Role | "";
  status?: "active" | "banned" | "";
  page?: number;
};

export async function searchAdminUsers(filters: UserListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.UserWhereInput = {};

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { username: { contains: q, mode: "insensitive" } },
      { minecraftUsername: { contains: q, mode: "insensitive" } },
      { minecraftUuid: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.status === "banned") {
    where.bans = {
      some: {
        liftedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        username: true,
        role: true,
        minecraftUsername: true,
        minecraftUuid: true,
        createdAt: true,
        bans: {
          where: {
            liftedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          take: 1,
          select: { id: true, reason: true, expiresAt: true },
        },
        userRoles: {
          include: { role: true },
          orderBy: { role: { priority: "asc" } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

export async function getAdminUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      minecraftUuid: true,
      minecraftUsername: true,
      minecraftLinkedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          threads: true,
          posts: true,
          sentMessages: true,
        },
      },
      userRoles: {
        include: { role: true },
        orderBy: { role: { priority: "asc" } },
      },
      bans: {
        orderBy: { createdAt: "desc" },
        include: {
          bannedBy: { select: { username: true } },
          liftedBy: { select: { username: true } },
        },
      },
    },
  });

  return user;
}

export async function getAdminUserThreads(userId: string, limit = 10) {
  return prisma.thread.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      forum: { select: { name: true, slug: true } },
    },
  });
}

export async function getAdminUserPosts(userId: string, limit = 10) {
  return prisma.post.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      content: true,
      createdAt: true,
      thread: { select: { id: true, title: true } },
    },
  });
}
