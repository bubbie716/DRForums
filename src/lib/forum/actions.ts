"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  canPost,
  isModerator,
  MINECRAFT_LINK_REQUIRED_MESSAGE,
} from "@/lib/auth";
import { generateThreadSlug } from "@/lib/slug";
import {
  validatePostContent,
  validateReplyContent,
  validateThreadTitle,
} from "@/lib/forum/validation";
import {
  isValidReactionType,
  summarizePostReactions,
  type ToggleReactionResult,
} from "@/lib/forum/reactions";

export type { ToggleReactionResult };
import type { ReactionType } from "@prisma/client";
import { cookies } from "next/headers";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

const THREAD_VIEW_COOKIE_PREFIX = "dr_thread_view_";
const THREAD_VIEW_COOKIE_MAX_AGE = 60 * 60;

export async function createThread(
  forumSlug: string,
  title: string,
  content: string
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in to create a thread." };
  }

  if (!canPost(user)) {
    return { success: false, error: MINECRAFT_LINK_REQUIRED_MESSAGE };
  }

  const titleValidation = validateThreadTitle(title);
  if (!titleValidation.valid) {
    return { success: false, error: titleValidation.error };
  }

  const contentValidation = validatePostContent(content);
  if (!contentValidation.valid) {
    return { success: false, error: contentValidation.error };
  }

  const forum = await prisma.forum.findUnique({
    where: { slug: forumSlug },
    select: { id: true, slug: true },
  });

  if (!forum) {
    return { success: false, error: "Forum not found." };
  }

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const slug = generateThreadSlug(trimmedTitle);

  const thread = await prisma.thread.create({
    data: {
      title: trimmedTitle,
      slug,
      content: trimmedContent,
      forumId: forum.id,
      authorId: user.id,
      posts: {
        create: {
          content: trimmedContent,
          authorId: user.id,
        },
      },
    },
    select: { id: true },
  });

  revalidatePath(`/forum/${forum.slug}`);
  revalidatePath("/");
  redirect(`/thread/${thread.id}`);
}

export async function createReply(
  threadId: string,
  content: string
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in to reply." };
  }

  if (!canPost(user)) {
    return { success: false, error: MINECRAFT_LINK_REQUIRED_MESSAGE };
  }

  const contentValidation = validateReplyContent(content);
  if (!contentValidation.valid) {
    return { success: false, error: contentValidation.error };
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, isLocked: true, forum: { select: { slug: true } } },
  });

  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  if (thread.isLocked) {
    return { success: false, error: "This thread is locked." };
  }

  await prisma.post.create({
    data: {
      content: content.trim(),
      threadId: thread.id,
      authorId: user.id,
    },
  });

  await prisma.thread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/thread/${thread.id}`);
  revalidatePath(`/forum/${thread.forum.slug}`);
  revalidatePath("/");

  return { success: true };
}

export async function toggleThreadPin(threadId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !isModerator(user.role)) {
    return { success: false, error: "Unauthorized." };
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, isPinned: true, forum: { select: { slug: true } } },
  });

  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  await prisma.thread.update({
    where: { id: threadId },
    data: { isPinned: !thread.isPinned },
  });

  revalidatePath(`/thread/${threadId}`);
  revalidatePath(`/forum/${thread.forum.slug}`);

  return { success: true };
}

export async function toggleThreadLock(threadId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !isModerator(user.role)) {
    return { success: false, error: "Unauthorized." };
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, isLocked: true, forum: { select: { slug: true } } },
  });

  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  await prisma.thread.update({
    where: { id: threadId },
    data: { isLocked: !thread.isLocked },
  });

  revalidatePath(`/thread/${threadId}`);
  revalidatePath(`/forum/${thread.forum.slug}`);

  return { success: true };
}

export async function recordThreadView(
  threadId: string
): Promise<{ recorded: boolean }> {
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

  if (!isValidReactionType(type)) {
    return { success: false, error: "Invalid reaction." };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      thread: {
        select: { id: true },
      },
    },
  });

  if (!post) {
    return { success: false, error: "Post not found." };
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
  }

  const reactions = await prisma.postReaction.findMany({
    where: { postId },
    select: { type: true, userId: true },
  });

  const summary = summarizePostReactions(reactions, user.id);

  revalidatePath(`/thread/${post.thread.id}`);

  return {
    success: true,
    counts: summary.counts,
    userReactions: summary.userReactions,
  };
}
