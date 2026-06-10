import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

export type BanListFilters = {
  status?: "active" | "lifted" | "expired" | "";
  q?: string;
  page?: number;
};

export async function searchAdminBans(filters: BanListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;
  const now = new Date();

  const where: Prisma.BanWhereInput = {};

  if (filters.q?.trim()) {
    where.user = {
      username: { contains: filters.q.trim(), mode: "insensitive" },
    };
  }

  if (filters.status === "active") {
    where.liftedAt = null;
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
  } else if (filters.status === "lifted") {
    where.liftedAt = { not: null };
  } else if (filters.status === "expired") {
    where.liftedAt = null;
    where.expiresAt = { lte: now };
  }

  const [bans, total] = await Promise.all([
    prisma.ban.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, username: true } },
        bannedBy: { select: { username: true } },
        liftedBy: { select: { username: true } },
      },
    }),
    prisma.ban.count({ where }),
  ]);

  return { bans, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getAdminBanDetail(banId: string) {
  return prisma.ban.findUnique({
    where: { id: banId },
    include: {
      user: { select: { id: true, username: true } },
      bannedBy: { select: { id: true, username: true } },
      liftedBy: { select: { id: true, username: true } },
    },
  });
}

export async function searchUsersForBan(query: string) {
  if (!query.trim()) return [];
  return prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: query.trim(), mode: "insensitive" } },
        { minecraftUsername: { contains: query.trim(), mode: "insensitive" } },
      ],
    },
    take: 10,
    select: { id: true, username: true, minecraftUsername: true },
  });
}
