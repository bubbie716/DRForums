import { prisma } from "@/lib/prisma";
import { isUserBanned } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canParticipateInPoll } from "@/lib/forumAccess";
import { ensurePollAutoClosed, isPollEffectivelyClosed } from "@/lib/poll/status";
import type { ThreadPollView } from "@/lib/poll/types";

export async function getThreadPoll(
  threadId: string,
  viewerId: string | null
): Promise<ThreadPollView | null> {
  const poll = await prisma.poll.findUnique({
    where: { threadId },
    include: {
      thread: {
        select: { authorId: true },
      },
      options: {
        orderBy: { sortOrder: "asc" },
        include: {
          votes: {
            include: {
              user: {
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

  if (!poll) {
    return null;
  }

  await ensurePollAutoClosed(poll);
  const closed = isPollEffectivelyClosed(poll);

  const userVotes =
    viewerId !== null
      ? poll.options.flatMap((option) =>
          option.votes
            .filter((vote) => vote.userId === viewerId)
            .map((vote) => vote.optionId)
        )
      : [];

  const uniqueVoterIds = new Set(
    poll.options.flatMap((option) => option.votes.map((vote) => vote.userId))
  );
  const totalVotes = poll.options.reduce(
    (sum, option) => sum + option.votes.length,
    0
  );
  const totalVoters = uniqueVoterIds.size;

  const [canParticipate, canCloseOwnPermission, canManagePermission, isBanned] =
    viewerId
      ? await Promise.all([
          canParticipateInPoll(viewerId, threadId),
          hasPermission(viewerId, "poll.closeOwn"),
          hasPermission(viewerId, "poll.closeAny"),
          isUserBanned(viewerId),
        ])
      : [false, false, false, false];

  const hasVoted = userVotes.length > 0;
  const canVote = canParticipate && !closed && !hasVoted && !isBanned;

  const canCloseOwn =
    !!viewerId &&
    !closed &&
    canCloseOwnPermission &&
    (poll.createdById === viewerId || poll.thread.authorId === viewerId);

  const canManage = !!viewerId && canManagePermission;

  const options = poll.options.map((option) => {
    const voteCount = option.votes.length;
    const percentage =
      totalVoters > 0 ? Math.round((voteCount / totalVoters) * 100) : 0;

    return {
      id: option.id,
      label: option.label,
      sortOrder: option.sortOrder,
      voteCount,
      percentage,
      voters: poll.isAnonymous
        ? []
        : option.votes.map((vote) => ({
            id: vote.user.id,
            username: vote.user.username,
          })),
    };
  });

  return {
    id: poll.id,
    threadId: poll.threadId,
    question: poll.question,
    allowMultiple: poll.allowMultiple,
    closesAt: poll.closesAt?.toISOString() ?? null,
    isClosed: closed,
    isAnonymous: poll.isAnonymous,
    createdById: poll.createdById,
    createdAt: poll.createdAt.toISOString(),
    totalVoters,
    totalVotes,
    options,
    userVotedOptionIds: userVotes,
    canVote,
    isBanned,
    canCloseOwn,
    canManage,
  };
}
