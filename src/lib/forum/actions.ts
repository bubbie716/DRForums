"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  canUserPost,
  isModerator,
  isUserBanned,
  MINECRAFT_LINK_REQUIRED_MESSAGE,
  BAN_RESTRICTED_MESSAGE,
} from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  canCreateThread,
  canModerateForum,
  canReplyToThread,
  canViewThread,
} from "@/lib/forumAccess";
import { generateThreadSlug } from "@/lib/slug";
import {
  hasMeaningfulPostContent,
  validatePostContent,
  validateReplyContent,
  validateThreadTitle,
} from "@/lib/forum/validation";
import {
  isValidReactionType,
  summarizePostReactions,
  type ToggleReactionResult,
} from "@/lib/forum/reactions";
import { createModerationLog, MODERATION_ACTIONS } from "@/lib/moderation-log";

export type { ToggleReactionResult };
import type { ReactionType } from "@prisma/client";
import { cookies } from "next/headers";
import {
  createForumMentionNotifications,
  createPostReactionNotification,
  createThreadReplyNotification,
} from "@/lib/forum-notifications/create";
import { validatePollInput } from "@/lib/poll/validation";
import type { PollCreateInput } from "@/lib/poll/types";
import { isPollsEnabled } from "@/lib/settings";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

const THREAD_VIEW_COOKIE_PREFIX = "dr_thread_view_";
const THREAD_VIEW_COOKIE_MAX_AGE = 60 * 60;

export async function createThread(
  forumSlug: string,
  title: string,
  content: string,
  pollInput?: PollCreateInput | null
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in to create a thread." };
  }

  if (await isUserBanned(user.id)) {
    return { success: false, error: BAN_RESTRICTED_MESSAGE };
  }

  if (!(await canUserPost(user))) {
    return { success: false, error: MINECRAFT_LINK_REQUIRED_MESSAGE };
  }

  const titleValidation = validateThreadTitle(title);
  if (!titleValidation.valid) {
    return { success: false, error: titleValidation.error };
  }

  const forum = await prisma.forum.findUnique({
    where: { slug: forumSlug },
    select: {
      id: true,
      slug: true,
      isVisible: true,
      isLocked: true,
      category: {
        select: { isVisible: true },
      },
    },
  });

  if (!forum) {
    return { success: false, error: "Forum not found." };
  }

  if (!forum.isVisible || !forum.category.isVisible) {
    return { success: false, error: "Forum not found." };
  }

  if (forum.isLocked) {
    return {
      success: false,
      error: "This forum is locked. No new threads can be created.",
    };
  }

  if (!(await canCreateThread(user.id, forum.id))) {
    return {
      success: false,
      error: "You do not have permission to create threads in this forum.",
    };
  }

  let validatedPoll: PollCreateInput | null = null;
  if (pollInput) {
    if (!(await isPollsEnabled())) {
      return {
        success: false,
        error: "Poll creation is currently disabled.",
      };
    }

    if (!(await hasPermission(user.id, "poll.create"))) {
      return {
        success: false,
        error: "You do not have permission to create polls.",
      };
    }

    const pollValidation = validatePollInput(pollInput);
    if (!pollValidation.valid) {
      return { success: false, error: pollValidation.error };
    }
    validatedPoll = pollValidation.data;
  }

  const contentValidation = validatePostContent(content, {
    optional: !!validatedPoll,
  });
  if (!contentValidation.valid) {
    return { success: false, error: contentValidation.error };
  }

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const slug = generateThreadSlug(trimmedTitle);
  const createOpeningPost = hasMeaningfulPostContent(trimmedContent);

  const thread = await prisma.thread.create({
    data: {
      title: trimmedTitle,
      slug,
      content: trimmedContent,
      forumId: forum.id,
      authorId: user.id,
      ...(createOpeningPost
        ? {
            posts: {
              create: {
                content: trimmedContent,
                authorId: user.id,
              },
            },
          }
        : {}),
      ...(validatedPoll
        ? {
            poll: {
              create: {
                question: validatedPoll.question,
                allowMultiple: validatedPoll.allowMultiple,
                isAnonymous: validatedPoll.isAnonymous,
                closesAt: validatedPoll.closesAt
                  ? new Date(validatedPoll.closesAt)
                  : null,
                createdById: user.id,
                options: {
                  create: validatedPoll.options.map((label, index) => ({
                    label,
                    sortOrder: index,
                  })),
                },
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      poll: {
        select: { id: true },
      },
      posts: {
        select: { id: true },
        take: 1,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (thread.poll) {
    await createModerationLog({
      actorId: user.id,
      action: MODERATION_ACTIONS.POLL_CREATED,
      details: {
        pollId: thread.poll.id,
        threadId: thread.id,
        forumSlug: forum.slug,
      },
    });
  }

  const postId = thread.posts[0]?.id;
  if (postId) {
    await createForumMentionNotifications({
      content: trimmedContent,
      actorUserId: user.id,
      postId,
      threadId: thread.id,
    });
  }

  revalidatePath(`/forum/${forum.slug}`);
  revalidatePath("/messages");
  revalidatePath("/");
  redirect(`/thread/${thread.id}`);
}

export async function createReply(
  threadId: string,
  content: string,
  replyToPostId?: string
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in to reply." };
  }

  if (await isUserBanned(user.id)) {
    return { success: false, error: BAN_RESTRICTED_MESSAGE };
  }

  if (!(await canUserPost(user))) {
    return { success: false, error: MINECRAFT_LINK_REQUIRED_MESSAGE };
  }

  const contentValidation = validateReplyContent(content);
  if (!contentValidation.valid) {
    return { success: false, error: contentValidation.error };
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      authorId: true,
      isLocked: true,
      forum: { select: { id: true, slug: true } },
    },
  });

  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  if (!(await canViewThread(user.id, thread.id))) {
    return { success: false, error: "You do not have permission to view this thread." };
  }

  if (!(await canReplyToThread(user.id, thread.id))) {
    return {
      success: false,
      error: "You do not have permission to reply in this forum.",
    };
  }

  if (thread.isLocked) {
    return { success: false, error: "This thread is locked." };
  }

  const trimmedContent = content.trim();

  if (replyToPostId) {
    const quotedPost = await prisma.post.findFirst({
      where: {
        id: replyToPostId,
        threadId: thread.id,
      },
      select: { id: true },
    });

    if (!quotedPost) {
      return { success: false, error: "Quoted post not found." };
    }
  }

  const post = await prisma.post.create({
    data: {
      content: trimmedContent,
      threadId: thread.id,
      authorId: user.id,
      replyToPostId: replyToPostId ?? null,
    },
    select: { id: true },
  });

  await createForumMentionNotifications({
    content: trimmedContent,
    actorUserId: user.id,
    postId: post.id,
    threadId: thread.id,
  });

  await createThreadReplyNotification({
    threadAuthorId: thread.authorId,
    actorUserId: user.id,
    threadId: thread.id,
    postId: post.id,
  });

  await prisma.thread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/thread/${thread.id}`);
  revalidatePath(`/forum/${thread.forum.slug}`);
  revalidatePath("/");
  revalidatePath("/messages");

  return { success: true };
}

export async function toggleThreadPin(threadId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      title: true,
      isPinned: true,
      forum: { select: { id: true, slug: true, name: true } },
    },
  });

  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  if (
    !(await canModerateForum(user.id, thread.forum.id)) ||
    (!(await hasPermission(user.id, "forum.thread.pin")) && !isModerator(user.role))
  ) {
    return { success: false, error: "Unauthorized." };
  }

  const nextPinned = !thread.isPinned;

  await prisma.thread.update({
    where: { id: threadId },
    data: { isPinned: nextPinned },
  });

  await createModerationLog({
    actorId: user.id,
    action: nextPinned
      ? MODERATION_ACTIONS.THREAD_PINNED
      : MODERATION_ACTIONS.THREAD_UNPINNED,
    details: {
      threadId,
      title: thread.title,
      forumSlug: thread.forum.slug,
      forumName: thread.forum.name,
    },
  });

  revalidatePath(`/thread/${threadId}`);
  revalidatePath(`/forum/${thread.forum.slug}`);

  return { success: true };
}

export async function toggleThreadLock(threadId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      title: true,
      isLocked: true,
      forum: { select: { id: true, slug: true, name: true } },
    },
  });

  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  if (
    !(await canModerateForum(user.id, thread.forum.id)) ||
    (!(await hasPermission(user.id, "forum.thread.lock")) && !isModerator(user.role))
  ) {
    return { success: false, error: "Unauthorized." };
  }

  const nextLocked = !thread.isLocked;

  await prisma.thread.update({
    where: { id: threadId },
    data: { isLocked: nextLocked },
  });

  await createModerationLog({
    actorId: user.id,
    action: nextLocked
      ? MODERATION_ACTIONS.THREAD_LOCKED
      : MODERATION_ACTIONS.THREAD_UNLOCKED,
    details: {
      threadId,
      title: thread.title,
      forumSlug: thread.forum.slug,
      forumName: thread.forum.name,
    },
  });

  revalidatePath(`/thread/${threadId}`);
  revalidatePath(`/forum/${thread.forum.slug}`);

  return { success: true };
}

export async function recordThreadView(
  threadId: string
): Promise<{ recorded: boolean }> {
  const user = await getSessionUser();
  const canView = await canViewThread(user?.id ?? null, threadId);
  if (!canView) {
    return { recorded: false };
  }

  const cookieStore = await cookies();
  const cookieName = `${THREAD_VIEW_COOKIE_PREFIX}${threadId}`;

  if (cookieStore.get(cookieName)) {
    return { recorded: false };
  }

  await prisma.thread.update({
    where: { id: threadId },
    data: { viewCount: { increment: 1 } },
  });

  cookieStore.set(cookieName, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THREAD_VIEW_COOKIE_MAX_AGE,
  });

  return { recorded: true };
}

export async function togglePostReaction(
  postId: string,
  type: ReactionType
): Promise<ToggleReactionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in to react." };
  }

  if (await isUserBanned(user.id)) {
    return { success: false, error: BAN_RESTRICTED_MESSAGE };
  }

  if (!isValidReactionType(type)) {
    return { success: false, error: "Invalid reaction." };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      thread: {
        select: { id: true },
      },
    },
  });

  if (!post) {
    return { success: false, error: "Post not found." };
  }

  if (!(await canViewThread(user.id, post.thread.id))) {
    return {
      success: false,
      error: "You do not have permission to react to this post.",
    };
  }

  const existing = await prisma.postReaction.findUnique({
    where: {
      postId_userId_type: {
        postId,
        userId: user.id,
        type,
      },
    },
  });

  if (existing) {
    await prisma.postReaction.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.postReaction.create({
      data: {
        postId,
        userId: user.id,
        type,
      },
    });

    await createPostReactionNotification({
      postAuthorId: post.authorId,
      actorUserId: user.id,
      threadId: post.thread.id,
      postId: post.id,
      reactionType: type,
    });
  }

  const reactions = await prisma.postReaction.findMany({
    where: { postId },
    select: { type: true, userId: true },
  });

  const summary = summarizePostReactions(reactions, user.id);

  revalidatePath(`/thread/${post.thread.id}`);
  revalidatePath("/messages");

  return {
    success: true,
    counts: summary.counts,
    userReactions: summary.userReactions,
  };
}
