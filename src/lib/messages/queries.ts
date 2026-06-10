import { prisma } from "@/lib/prisma";

export type ConversationListItem = {
  id: string;
  otherUser: {
    id: string;
    username: string;
  };
  subject: string | null;
  latestMessage: {
    id: string;
    content: string;
    createdAt: Date;
    senderId: string;
    senderUsername: string;
  } | null;
  unreadCount: number;
  updatedAt: Date;
};

function countUnreadMessages(
  messages: { createdAt: Date; senderId: string }[],
  userId: string,
  lastReadAt: Date | null
): number {
  const readAfter = lastReadAt ?? new Date(0);

  return messages.filter(
    (message) =>
      message.senderId !== userId && message.createdAt > readAfter
  ).length;
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const participations = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          messages: {
            where: { deletedAt: null },
            select: {
              createdAt: true,
              senderId: true,
            },
          },
        },
      },
    },
  });

  return participations.reduce(
    (total, participation) =>
      total +
      countUnreadMessages(
        participation.conversation.messages,
        userId,
        participation.lastReadAt
      ),
    0
  );
}

export async function getConversationList(
  userId: string
): Promise<ConversationListItem[]> {
  const participations = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const oneToOneParticipations = participations.filter(
    (participation) => participation.conversation.participants.length === 2
  );

  const items = oneToOneParticipations
    .map((participation) => {
      const { conversation } = participation;
      const otherParticipant = conversation.participants.find(
        (participant) => participant.userId !== userId
      );

      if (!otherParticipant) {
        return null;
      }

      const latestMessage = conversation.messages[0] ?? null;
      const firstMessage =
        conversation.messages[conversation.messages.length - 1] ?? null;

      return {
        id: conversation.id,
        otherUser: otherParticipant.user,
        subject:
          conversation.subject ?? firstMessage?.subject ?? null,
        latestMessage: latestMessage
          ? {
              id: latestMessage.id,
              content: latestMessage.content,
              createdAt: latestMessage.createdAt,
              senderId: latestMessage.senderId,
              senderUsername: latestMessage.sender.username,
            }
          : null,
        unreadCount: countUnreadMessages(
          conversation.messages,
          userId,
          participation.lastReadAt
        ),
        updatedAt: conversation.updatedAt,
      };
    })
    .filter((item): item is ConversationListItem => item !== null);

  return items.sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

export async function getConversationForUser(
  conversationId: string,
  userId: string
) {
  const participation = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
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
      },
    },
  });

  if (!participation || participation.deletedAt) {
    return null;
  }

  if (participation.conversation.participants.length !== 2) {
    return null;
  }

  const otherUser = participation.conversation.participants.find(
    (participant) => participant.userId !== userId
  )?.user;

  if (!otherUser) {
    return null;
  }

  const firstMessage = participation.conversation.messages[0] ?? null;

  return {
    id: participation.conversation.id,
    otherUser,
    subject:
      participation.conversation.subject ?? firstMessage?.subject ?? null,
    messages: participation.conversation.messages,
    lastReadAt: participation.lastReadAt,
  };
}

export async function setConversationLastReadAt(
  conversationId: string,
  userId: string
): Promise<void> {
  await prisma.conversationParticipant.updateMany({
    where: {
      conversationId,
      userId,
      deletedAt: null,
    },
    data: {
      lastReadAt: new Date(),
    },
  });
}

export async function getRecipientByUsername(
  username: string,
  currentUserId: string
) {
  const trimmed = username.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { username: trimmed },
    select: {
      id: true,
      username: true,
      minecraftUsername: true,
    },
  });

  if (!user || user.id === currentUserId) {
    return null;
  }

  return user;
}

export async function searchUsersByUsername(
  query: string,
  currentUserId: string,
  limit = 8
) {
  const trimmed = query.trim().toLowerCase();

  if (trimmed.length < 1) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      username: {
        contains: trimmed,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      username: true,
      minecraftUsername: true,
    },
    orderBy: { username: "asc" },
    take: limit,
  });
}
