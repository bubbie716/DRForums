import type { ForumNotificationType, ReactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ForumNotificationItem = {
  id: string;
  type: ForumNotificationType;
  createdAt: Date;
  readAt: Date | null;
  reactionType: ReactionType | null;
  roleName: string | null;
  recipientUsername: string;
  actor: {
    id: string;
    username: string;
    minecraftUsername: string | null;
  };
  post: {
    id: string;
    content: string;
    thread: {
      id: string;
      title: string;
      forum: { slug: string };
    };
  } | null;
  thread: {
    id: string;
    title: string;
    forum: { slug: string };
  } | null;
};

export async function getUnreadForumNotificationCount(
  userId: string
): Promise<number> {
  return prisma.forumNotification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function getForumNotifications(
  userId: string
): Promise<ForumNotificationItem[]> {
  const notifications = await prisma.forumNotification.findMany({
    where: { userId },
    include: {
      user: {
        select: {
          username: true,
        },
      },
      actor: {
        select: {
          id: true,
          username: true,
          minecraftUsername: true,
        },
      },
      post: {
        select: {
          id: true,
          content: true,
          thread: {
            select: {
              id: true,
              title: true,
              forum: { select: { slug: true } },
            },
          },
        },
      },
      thread: {
        select: {
          id: true,
          title: true,
          forum: { select: { slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    createdAt: notification.createdAt,
    readAt: notification.readAt,
    reactionType: notification.reactionType,
    roleName: notification.roleName,
    recipientUsername: notification.user.username,
    actor: notification.actor,
    post: notification.post,
    thread: notification.thread ?? notification.post?.thread ?? null,
  }));
}

export async function markForumNotificationsAsRead(
  userId: string
): Promise<void> {
  await prisma.forumNotification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
