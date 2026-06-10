"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  normalizeRecipientUsername,
  validateMessageContent,
} from "@/lib/messages/validation";
import { searchUsersByUsername } from "@/lib/messages/queries";
import {
  isValidReactionType,
  summarizePostReactions,
  type ToggleReactionResult,
} from "@/lib/forum/reactions";
import type { ReactionType } from "@prisma/client";

export type MessageActionResult =
  | { success: true }
  | { success: false; error: string };

async function findExistingConversation(userId: string, otherUserId: string) {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: {
      conversationId: true,
      conversation: {
        select: {
          id: true,
          participants: {
            select: { userId: true },
          },
        },
      },
    },
  });

  return (
    participations.find(
      (participation) =>
        participation.conversation.participants.length === 2 &&
        participation.conversation.participants.some(
          (participant) => participant.userId === otherUserId
        )
    )?.conversation ?? null
  );
}

async function restoreConversationForParticipants(conversationId: string) {
  await prisma.conversationParticipant.updateMany({
    where: { conversationId },
    data: { deletedAt: null },
  });
}

async function sendMessageToRecipient(
  senderId: string,
  recipientId: string,
  content: string
): Promise<string> {
  const existingConversation = await findExistingConversation(
    senderId,
    recipientId
  );

  if (existingConversation) {
    await restoreConversationForParticipants(existingConversation.id);

    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: existingConversation.id,
          senderId,
          content,
        },
      }),
      prisma.conversation.update({
        where: { id: existingConversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return existingConversation.id;
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: senderId }, { userId: recipientId }],
      },
      messages: {
        create: {
          senderId,
          content,
        },
      },
    },
    select: { id: true },
  });

  return conversation.id;
}

export async function sendMessage(
  recipientUsernames: string[],
  content: string
): Promise<MessageActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in to send messages." };
  }

  const normalizedUsernames = [
    ...new Set(
      recipientUsernames
        .map((username) => normalizeRecipientUsername(username))
        .filter(Boolean)
    ),
  ];

  if (normalizedUsernames.length === 0) {
    return { success: false, error: "Add at least one recipient." };
  }

  if (normalizedUsernames.includes(user.username)) {
    return { success: false, error: "You cannot message yourself." };
  }

  const contentValidation = validateMessageContent(content);
  if (!contentValidation.valid) {
    return { success: false, error: contentValidation.error };
  }

  const recipients = await prisma.user.findMany({
    where: {
      username: { in: normalizedUsernames },
    },
    select: { id: true, username: true },
  });

  if (recipients.length !== normalizedUsernames.length) {
    return { success: false, error: "One or more recipients were not found." };
  }

  const conversationIds: string[] = [];

  for (const recipient of recipients) {
    const conversationId = await sendMessageToRecipient(
      user.id,
      recipient.id,
      contentValidation.value
    );
    conversationIds.push(conversationId);
  }

  revalidatePath("/messages");
  revalidatePath("/", "layout");

  if (conversationIds.length === 1) {
    redirect(`/messages/${conversationIds[0]}`);
  }

  redirect("/messages");
}

export async function replyToConversation(
  conversationId: string,
  content: string
): Promise<MessageActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in to reply." };
  }

  const contentValidation = validateMessageContent(content);
  if (!contentValidation.valid) {
    return { success: false, error: contentValidation.error };
  }

  const participation = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: user.id,
      },
    },
    select: { deletedAt: true },
  });

  if (!participation || participation.deletedAt) {
    return { success: false, error: "Conversation not found." };
  }

  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content: contentValidation.value,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
    prisma.conversationParticipant.updateMany({
      where: { conversationId },
      data: { deletedAt: null },
    }),
    prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
      data: { lastReadAt: new Date() },
    }),
  ]);

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function toggleMessageReaction(
  messageId: string,
  type: ReactionType
): Promise<ToggleReactionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in to react." };
  }

  if (!isValidReactionType(type)) {
    return { success: false, error: "Invalid reaction." };
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      deletedAt: true,
      conversationId: true,
      conversation: {
        select: {
          participants: {
            select: {
              userId: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });

  if (!message || message.deletedAt) {
    return { success: false, error: "Message not found." };
  }

  const isParticipant = message.conversation.participants.some(
    (participant) =>
      participant.userId === user.id && participant.deletedAt === null
  );

  if (!isParticipant) {
    return { success: false, error: "Message not found." };
  }

  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_type: {
        messageId,
        userId: user.id,
        type,
      },
    },
  });

  if (existing) {
    await prisma.messageReaction.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.messageReaction.create({
      data: {
        messageId,
        userId: user.id,
        type,
      },
    });
  }

  const reactions = await prisma.messageReaction.findMany({
    where: { messageId },
    select: { type: true, userId: true },
  });

  const summary = summarizePostReactions(reactions, user.id);

  revalidatePath(`/messages/${message.conversationId}`);

  return {
    success: true,
    counts: summary.counts,
    userReactions: summary.userReactions,
  };
}

export async function refreshMessagesAfterRead(
  conversationId: string
): Promise<void> {
  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/", "layout");
}

export async function searchMessageRecipients(query: string) {
  const user = await getSessionUser();
  if (!user) {
    return [];
  }

  return searchUsersByUsername(query, user.id);
}

export async function deleteConversationFromInbox(
  conversationId: string
): Promise<MessageActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const result = await prisma.conversationParticipant.updateMany({
    where: {
      conversationId,
      userId: user.id,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  if (result.count === 0) {
    return { success: false, error: "Conversation not found." };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/", "layout");
  return { success: true };
}
