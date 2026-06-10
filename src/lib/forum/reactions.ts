import type { ReactionType } from "@prisma/client";

export const REACTION_TYPES = [
  "THUMBS_UP",
  "HEART",
  "FIRE",
  "THUMBS_DOWN",
] as const satisfies readonly ReactionType[];

export type ReactionCounts = Record<ReactionType, number>;

export type ToggleReactionResult =
  | {
      success: true;
      counts: ReactionCounts;
      userReactions: ReactionType[];
    }
  | { success: false; error: string };

export const EMPTY_REACTION_COUNTS: ReactionCounts = {
  THUMBS_UP: 0,
  HEART: 0,
  FIRE: 0,
  THUMBS_DOWN: 0,
};

export const REACTION_META: Record<
  ReactionType,
  { label: string; emoji: string }
> = {
  THUMBS_UP: { label: "Thumbs up", emoji: "👍" },
  HEART: { label: "Heart", emoji: "❤️" },
  FIRE: { label: "Fire", emoji: "🔥" },
  THUMBS_DOWN: { label: "Thumbs down", emoji: "👎" },
};

const POSITIVE_REACTION_TYPES = new Set<ReactionType>([
  "THUMBS_UP",
  "HEART",
  "FIRE",
]);

export function isValidReactionType(value: string): value is ReactionType {
  return REACTION_TYPES.includes(value as ReactionType);
}

export function getReactionStateKey(
  counts: ReactionCounts,
  userReactions: ReactionType[]
): string {
  const countKey = REACTION_TYPES.map((type) => counts[type]).join(",");
  const userKey = [...userReactions].sort().join(",");
  return `${countKey}|${userKey}`;
}

export function summarizePostReactions(
  reactions: { type: ReactionType; userId: string }[],
  currentUserId?: string | null
): { counts: ReactionCounts; userReactions: ReactionType[] } {
  const counts = { ...EMPTY_REACTION_COUNTS };
  const userReactionSet = new Set<ReactionType>();

  for (const reaction of reactions) {
    counts[reaction.type] += 1;
    if (currentUserId && reaction.userId === currentUserId) {
      userReactionSet.add(reaction.type);
    }
  }

  return { counts, userReactions: [...userReactionSet] };
}

/** Score one user's reactions on a single post toward the author's ratio. */
export function scoreUserReactionsOnPost(types: ReactionType[]): number {
  const uniqueTypes = [...new Set(types)];
  const hasPositive = uniqueTypes.some((type) =>
    POSITIVE_REACTION_TYPES.has(type)
  );
  const hasNegative = uniqueTypes.includes("THUMBS_DOWN");

  if (hasPositive && hasNegative) {
    return 0;
  }
  if (hasPositive) {
    return 1;
  }
  if (hasNegative) {
    return -1;
  }
  return 0;
}

export function calculateReactionRatioFromReactions(
  reactions: { postId: string; userId: string; type: ReactionType }[]
): number {
  const reactionsByUserPost = new Map<string, ReactionType[]>();

  for (const reaction of reactions) {
    const key = `${reaction.postId}:${reaction.userId}`;
    const types = reactionsByUserPost.get(key) ?? [];
    types.push(reaction.type);
    reactionsByUserPost.set(key, types);
  }

  let total = 0;
  for (const types of reactionsByUserPost.values()) {
    total += scoreUserReactionsOnPost(types);
  }

  return total;
}
