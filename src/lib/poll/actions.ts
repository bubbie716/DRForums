"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  isUserBanned,
  BAN_RESTRICTED_MESSAGE,
} from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canParticipateInPoll, canViewThread } from "@/lib/forumAccess";
import {
  ensurePollAutoClosed,
  isPollEffectivelyClosed,
} from "@/lib/poll/status";
import { validatePollVoteOptions } from "@/lib/poll/validation";
import { createModerationLog, MODERATION_ACTIONS } from "@/lib/moderation-log";

export type PollActionResult =
  | { success: true }
  | { success: false; error: string };

async function getPollWithThread(pollId: string) {
  return prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      thread: {
        select: {
          id: true,
          authorId: true,
          forum: {
            select: { slug: true },
          },
        },
      },
      options: {
        select: { id: true },
      },
    },
  });
}

async function canClosePoll(
  userId: string,
  poll: { createdById: string; thread: { authorId: string } }
): Promise<boolean> {
  if (await hasPermission(userId, "poll.closeAny")) {
    return true;
  }

  if (!(await hasPermission(userId, "poll.closeOwn"))) {
    return false;
  }

  return (
    poll.createdById === userId || poll.thread.authorId === userId
  );
}

function revalidatePollThread(threadId: string, forumSlug: string) {
  revalidatePath(`/thread/${threadId}`);
  revalidatePath(`/forum/${forumSlug}`);
}

export async function votePoll(
  pollId: string,
  optionIds: string[]
): Promise<PollActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in to vote." };
  }

  if (await isUserBanned(user.id)) {
    return { success: false, error: BAN_RESTRICTED_MESSAGE };
  }

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      thread: {
        select: {
          id: true,
          forum: { select: { slug: true } },
        },
      },
      options: {
        select: { id: true },
      },
    },
  });

  if (!poll) {
    return { success: false, error: "Poll not found." };
  }

  if (!(await canParticipateInPoll(user.id, poll.thread.id))) {
    return { success: false, error: "You do not have permission to vote in this poll." };
  }

  await ensurePollAutoClosed(poll);
  if (isPollEffectivelyClosed(poll)) {
    return { success: false, error: "This poll is closed." };
  }

  const validation = validatePollVoteOptions(
    optionIds,
    poll.allowMultiple,
    poll.options.map((option) => option.id)
  );
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingVoteCount = await tx.pollVote.count({
        where: {
          pollId: poll.id,
          userId: user.id,
        },
      });

      if (existingVoteCount > 0) {
        throw new Error("ALREADY_VOTED");
      }

      await tx.pollVote.createMany({
        data: optionIds.map((optionId) => ({
          pollId: poll.id,
          optionId,
          userId: user.id,
        })),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_VOTED") {
      return { success: false, error: "You have already voted in this poll." };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "You have already voted in this poll." };
    }

    throw error;
  }

  revalidatePollThread(poll.thread.id, poll.thread.forum.slug);
  return { success: true };
}

export async function closePoll(pollId: string): Promise<PollActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const poll = await getPollWithThread(pollId);
  if (!poll) {
    return { success: false, error: "Poll not found." };
  }

  if (!(await canViewThread(user.id, poll.thread.id))) {
    return { success: false, error: "Poll not found." };
  }

  if (!(await canClosePoll(user.id, poll))) {
    return { success: false, error: "You do not have permission to close this poll." };
  }

  await ensurePollAutoClosed(poll);
  if (isPollEffectivelyClosed(poll)) {
    return { success: false, error: "This poll is already closed." };
  }

  await prisma.poll.update({
    where: { id: poll.id },
    data: { isClosed: true },
  });

  await createModerationLog({
    actorId: user.id,
    action: MODERATION_ACTIONS.POLL_CLOSED,
    details: {
      pollId: poll.id,
      threadId: poll.thread.id,
      forumSlug: poll.thread.forum.slug,
    },
  });

  revalidatePollThread(poll.thread.id, poll.thread.forum.slug);
  return { success: true };
}

export async function reopenPoll(pollId: string): Promise<PollActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  if (!(await hasPermission(user.id, "poll.closeAny"))) {
    return { success: false, error: "You do not have permission to reopen polls." };
  }

  const poll = await getPollWithThread(pollId);
  if (!poll) {
    return { success: false, error: "Poll not found." };
  }

  if (!(await canViewThread(user.id, poll.thread.id))) {
    return { success: false, error: "Poll not found." };
  }

  if (!poll.isClosed) {
    return { success: false, error: "This poll is already open." };
  }

  await prisma.poll.update({
    where: { id: poll.id },
    data: { isClosed: false },
  });

  await createModerationLog({
    actorId: user.id,
    action: MODERATION_ACTIONS.POLL_REOPENED,
    details: {
      pollId: poll.id,
      threadId: poll.thread.id,
      forumSlug: poll.thread.forum.slug,
      closesAt: poll.closesAt?.toISOString() ?? null,
    },
  });

  revalidatePollThread(poll.thread.id, poll.thread.forum.slug);
  return { success: true };
}

export async function deletePoll(pollId: string): Promise<PollActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  if (!(await hasPermission(user.id, "poll.closeAny"))) {
    return { success: false, error: "You do not have permission to delete polls." };
  }

  const poll = await getPollWithThread(pollId);
  if (!poll) {
    return { success: false, error: "Poll not found." };
  }

  if (!(await canViewThread(user.id, poll.thread.id))) {
    return { success: false, error: "Poll not found." };
  }

  await prisma.poll.delete({
    where: { id: poll.id },
  });

  await createModerationLog({
    actorId: user.id,
    action: MODERATION_ACTIONS.POLL_DELETED,
    details: {
      pollId: poll.id,
      threadId: poll.thread.id,
      forumSlug: poll.thread.forum.slug,
    },
  });

  revalidatePollThread(poll.thread.id, poll.thread.forum.slug);
  return { success: true };
}
