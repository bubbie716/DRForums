import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 30;

export type LogListFilters = {
  action?: string;
  actorId?: string;
  targetUserId?: string;
  page?: number;
};

export async function searchModerationLogs(filters: LogListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.ModerationLogWhereInput = {};

  if (filters.action?.trim()) {
    where.action = filters.action.trim();
  }
  if (filters.actorId?.trim()) {
    where.actorId = filters.actorId.trim();
  }
  if (filters.targetUserId?.trim()) {
    where.targetUserId = filters.targetUserId.trim();
  }

  const [logs, total, actions] = await Promise.all([
    prisma.moderationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        actor: { select: { id: true, username: true } },
        targetUser: { select: { id: true, username: true } },
      },
    }),
    prisma.moderationLog.count({ where }),
    prisma.moderationLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    actions: actions.map((a) => a.action),
  };
}
