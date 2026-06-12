import { prisma } from "@/lib/prisma";

type PollStatusFields = {
  id: string;
  isClosed: boolean;
  closesAt: Date | null;
};

export function isPollEffectivelyClosed(poll: {
  isClosed: boolean;
  closesAt: Date | null;
}): boolean {
  if (poll.isClosed) {
    return true;
  }
  if (poll.closesAt && poll.closesAt.getTime() <= Date.now()) {
    return true;
  }
  return false;
}

export async function ensurePollAutoClosed(
  poll: PollStatusFields
): Promise<boolean> {
  if (poll.isClosed) {
    return true;
  }

  if (!poll.closesAt || poll.closesAt.getTime() > Date.now()) {
    return false;
  }

  await prisma.poll.update({
    where: { id: poll.id },
    data: { isClosed: true },
  });

  return true;
}
