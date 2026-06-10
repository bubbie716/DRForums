"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isPrismaSchemaReady,
  PRISMA_SCHEMA_STALE_MESSAGE,
  prisma,
} from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  normalizeRecipientUsername,
  validateMessageContent,
  validateMessageSubject,
} from "@/lib/messages/validation";
import { searchUsersByUsername } from "@/lib/messages/queries";
import {
  isValidReactionType,
  summarizePostReactions,
  type ToggleReactionResult,
} from "@/lib/forum/reactions";
import type { ReactionType } from "@prisma/client";
import { MentionSource } from "@prisma/client";
import { createForumMentionsForContent } from "@/lib/forum-notifications/create";

export type MessageActionResult =
  | { success: true }
  | { success: false; error: string };

async function restoreConversationForParticipants(conversationId: string) {
  await prisma.conversationParticipant.updateMany({
    where: { conversationId },
    data: { deletedAt: null },
  });
}

async function createGroupConversation(
  senderId: string,
  recipientIds: string[],
  subject: string,
  content: string
): Promise<{ conversationId: string; messageId: string }> {
  const participantIds = [senderId, ...recipientIds];

  return prisma.$transaction(async (tx) => {
    const createdConversation = await tx.conversation.create({
      data: {
        subject,
        participants: {
          create: participantIds.map((userId) => ({ userId })),
        },
      },
      select: { id: true },
    });

    const message = await tx.message.create({
      data: {
        conversationId: createdConversation.id,
        senderId,
        content,
      },
      select: { id: true },
    });

    return {
      conversationId: createdConversation.id,
      messageId: message.id,
    };
  });
}

export async function sendMessage(
  recipientUsernames: string[],
  subject: string,
  content: string
): Promise<MessageActionResult> {
  if (!isPrismaSchemaReady()) {
    return { success: false, error: PRISMA_SCHEMA_STALE_MESSAGE };
  }

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

  const subjectValidation = validateMessageSubject(subject);
  if (!subjectValidation.valid) {
    return { success: false, error: subjectValidation.error };
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

  const { conversationId, messageId } = await createGroupConversation(
    user.id,
    recipients.map((recipient) => recipient.id),
    subjectValidation.value,
    contentValidation.value
  );

  await createForumMentionsForContent({
    content: contentValidation.value,
    mentionerUserId: user.id,
    source: MentionSource.DIRECT_MESSAGE,
    messageId,
  });

  revalidatePath("/messages");
  revalidatePath("/", "layout");
  redirect(`/messages/${conversationId}`);
}

export async function replyToConversation(
  conversationId: string,
  content: string,
  replyToMessageId?: string
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

  if (replyToMessageId) {
    const quotedMessage = await prisma.message.findFirst({
      where: {
        id: replyToMessageId,
        conversationId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!quotedMessage) {
      return { success: false, error: "Quoted message not found." };
    }
  }

  const message = await prisma.$transaction(async (tx) => {
    const createdMessage = await tx.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content: contentValidation.value,
        replyToMessageId: replyToMessageId ?? null,
      },
      select: { id: true },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    await tx.conversationParticipant.updateMany({
      where: { conversationId },
      data: { deletedAt: null },
    });
    await tx.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
      data: { lastReadAt: new Date() },
    });

    return createdMessage;
  });

  await createForumMentionsForContent({
    content: contentValidation.value,
    mentionerUserId: user.id,
    source: MentionSource.DIRECT_MESSAGE,
    messageId: message.id,
  });

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/", "layout");
  return { success: true };
}

/** DM reactions are not included in profile reaction ratio (forum posts only). */
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
