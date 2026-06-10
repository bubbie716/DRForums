import { prisma } from "@/lib/prisma";
import { getSettingBoolean, SETTING_KEYS } from "@/lib/settings";
import { getActiveBan } from "@/lib/bans";

export async function getAdminDashboardStats() {
  const [
    totalUsers,
    linkedMinecraft,
    activeBans,
    totalThreads,
    totalPosts,
    totalConversations,
    maintenanceMode,
    recentUsers,
    recentLogs,
    recentBans,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { minecraftUuid: { not: null } } }),
    prisma.ban.count({
      where: {
        liftedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
    prisma.thread.count(),
    prisma.post.count(),
    prisma.conversation.count(),
    getSettingBoolean(SETTING_KEYS.maintenanceMode),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        minecraftUsername: true,
      },
    }),
    prisma.moderationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        actor: { select: { username: true } },
        targetUser: { select: { username: true } },
      },
    }),
    prisma.ban.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { username: true } },
        bannedBy: { select: { username: true } },
      },
    }),
  ]);

  return {
    totalUsers,
    linkedMinecraft,
    activeBans,
    totalThreads,
    totalPosts,
    totalConversations,
    maintenanceMode,
    recentUsers,
    recentLogs,
    recentBans,
  };
}

export async function getUserBanStatus(userId: string) {
  return getActiveBan(userId);
}
