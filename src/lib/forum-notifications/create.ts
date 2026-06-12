import {
  ForumNotificationType,
  MentionSource,
  type FormSubmissionStatus,
  type ReactionType,
} from "@prisma/client";
import { formReviewNotificationRoleName } from "@/lib/form/review-messages";
import { prisma } from "@/lib/prisma";
import { extractMentionUsernames } from "@/lib/mentions/parse";

type CreateForumNotificationInput = {
  userId: string;
  actorUserId: string;
  type: ForumNotificationType;
  postId?: string;
  threadId?: string;
  reactionType?: ReactionType;
};

async function createForumNotification({
  userId,
  actorUserId,
  type,
  postId,
  threadId,
  reactionType,
}: CreateForumNotificationInput): Promise<void> {
  if (userId === actorUserId) {
    return;
  }

  const existing = await prisma.forumNotification.findFirst({
    where: {
      userId,
      actorUserId,
      type,
      postId: postId ?? null,
      reactionType: reactionType ?? null,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.forumNotification.update({
      where: { id: existing.id },
      data: {
        readAt: null,
        createdAt: new Date(),
        threadId: threadId ?? null,
      },
    });
    return;
  }

  await prisma.forumNotification.create({
    data: {
      userId,
      actorUserId,
      type,
      postId: postId ?? null,
      threadId: threadId ?? null,
      reactionType: reactionType ?? null,
    },
  });
}

export async function createForumMentionNotifications({
  content,
  actorUserId,
  postId,
  threadId,
}: {
  content: string;
  actorUserId: string;
  postId: string;
  threadId: string;
}): Promise<void> {
  const usernames = extractMentionUsernames(content);
  if (usernames.length === 0) {
    return;
  }

  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true },
  });

  const seen = new Set<string>();

  for (const user of users) {
    if (seen.has(user.id)) {
      continue;
    }

    seen.add(user.id);

    await createForumNotification({
      userId: user.id,
      actorUserId,
      type: ForumNotificationType.MENTION,
      postId,
      threadId,
    });
  }
}

export async function createForumMentionsForContent({
  content,
  mentionerUserId,
  source,
  postId,
  messageId,
  threadId,
}: {
  content: string;
  mentionerUserId: string;
  source: MentionSource;
  postId?: string;
  messageId?: string;
  threadId?: string;
}): Promise<void> {
  if (source === MentionSource.FORUM) {
    if (!postId || !threadId) {
      return;
    }

    await createForumMentionNotifications({
      content,
      actorUserId: mentionerUserId,
      postId,
      threadId,
    });
    return;
  }

  const usernames = extractMentionUsernames(content);
  if (usernames.length === 0 || !messageId) {
    return;
  }

  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true },
  });

  const seen = new Set<string>();
  const data = users
    .filter((user) => user.id !== mentionerUserId)
    .filter((user) => {
      if (seen.has(user.id)) {
        return false;
      }

      seen.add(user.id);
      return true;
    })
    .map((user) => ({
      mentionedUserId: user.id,
      mentionerUserId,
      username: user.username,
      source,
      postId: null,
      messageId,
    }));

  if (data.length === 0) {
    return;
  }

  await prisma.mention.createMany({ data });
}

export async function createThreadReplyNotification({
  threadAuthorId,
  actorUserId,
  threadId,
  postId,
}: {
  threadAuthorId: string;
  actorUserId: string;
  threadId: string;
  postId: string;
}): Promise<void> {
  await createForumNotification({
    userId: threadAuthorId,
    actorUserId,
    type: ForumNotificationType.THREAD_REPLY,
    postId,
    threadId,
  });
}

export async function createRoleChangeNotification({
  userId,
  actorUserId,
  type,
  roleName,
}: {
  userId: string;
  actorUserId: string;
  type: "ROLE_ASSIGNED" | "ROLE_REMOVED";
  roleName: string;
}): Promise<void> {
  await prisma.forumNotification.create({
    data: {
      userId,
      actorUserId,
      type:
        type === "ROLE_ASSIGNED"
          ? ForumNotificationType.ROLE_ASSIGNED
          : ForumNotificationType.ROLE_REMOVED,
      roleName,
    },
  });
}

export async function createFormSubmissionReviewNotification({
  submitterId,
  actorUserId,
  threadId,
  postId,
  status,
}: {
  submitterId: string;
  actorUserId: string;
  threadId: string;
  postId: string;
  status: Exclude<FormSubmissionStatus, "PENDING">;
}): Promise<void> {
  if (submitterId === actorUserId) {
    return;
  }

  await prisma.forumNotification.create({
    data: {
      userId: submitterId,
      actorUserId,
      type: ForumNotificationType.FORM_SUBMISSION_REVIEWED,
      threadId,
      postId,
      roleName: formReviewNotificationRoleName(status),
    },
  });
}

export async function createPostReactionNotification({
  postAuthorId,
  actorUserId,
  threadId,
  postId,
  reactionType,
}: {
  postAuthorId: string;
  actorUserId: string;
  threadId: string;
  postId: string;
  reactionType: ReactionType;
}): Promise<void> {
  await createForumNotification({
    userId: postAuthorId,
    actorUserId,
    type: ForumNotificationType.POST_REACTION,
    postId,
    threadId,
    reactionType,
  });
}
