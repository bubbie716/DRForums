import { prisma } from "@/lib/prisma";

export {
  BAN_RESTRICTED_MESSAGE,
  FORUM_BAN_SCOPE_NOTE,
  formatBanExpiry,
} from "@/lib/ban-copy";

export type ActiveBanInfo = {
  id: string;
  reason: string;
  expiresAt: Date | null;
  createdAt: Date;
};

export async function getActiveBan(userId: string): Promise<ActiveBanInfo | null> {
  const now = new Date();

  const ban = await prisma.ban.findFirst({
    where: {
      userId,
      liftedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reason: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return ban;
}

export async function isUserBanned(userId: string): Promise<boolean> {
  const ban = await getActiveBan(userId);
  return ban !== null;
}

