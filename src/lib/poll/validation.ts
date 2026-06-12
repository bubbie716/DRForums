import type { PollCreateInput } from "@/lib/poll/types";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;
const MAX_QUESTION_LENGTH = 300;
const MAX_OPTION_LENGTH = 120;

export type PollValidationResult =
  | { valid: true; data: PollCreateInput }
  | { valid: false; error: string };

export function validatePollInput(input: PollCreateInput): PollValidationResult {
  const question = input.question.trim();
  if (!question) {
    return { valid: false, error: "Poll question is required." };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      valid: false,
      error: `Poll question must be ${MAX_QUESTION_LENGTH} characters or fewer.`,
    };
  }

  const options = input.options.map((option) => option.trim());
  if (options.length < MIN_OPTIONS) {
    return {
      valid: false,
      error: `Polls need at least ${MIN_OPTIONS} options.`,
    };
  }
  if (options.length > MAX_OPTIONS) {
    return {
      valid: false,
      error: `Polls can have at most ${MAX_OPTIONS} options.`,
    };
  }

  if (options.some((option) => !option)) {
    return { valid: false, error: "Poll options cannot be empty." };
  }

  if (options.some((option) => option.length > MAX_OPTION_LENGTH)) {
    return {
      valid: false,
      error: `Each poll option must be ${MAX_OPTION_LENGTH} characters or fewer.`,
    };
  }

  const normalizedOptions = options.map((option) => option.toLowerCase());
  if (new Set(normalizedOptions).size !== normalizedOptions.length) {
    return { valid: false, error: "Poll options must be unique." };
  }

  let closesAt: string | null = null;
  if (input.closesAt) {
    const parsed = new Date(input.closesAt);
    if (Number.isNaN(parsed.getTime())) {
      return { valid: false, error: "Poll close date is invalid." };
    }
    if (parsed.getTime() <= Date.now()) {
      return { valid: false, error: "Poll close date must be in the future." };
    }
    closesAt = parsed.toISOString();
  }

  return {
    valid: true,
    data: {
      question,
      options,
      allowMultiple: input.allowMultiple,
      isAnonymous: input.isAnonymous,
      closesAt,
    },
  };
}

export function validatePollVoteOptions(
  optionIds: string[],
  allowMultiple: boolean,
  validOptionIds: string[]
): { valid: true } | { valid: false; error: string } {
  if (optionIds.length === 0) {
    return { valid: false, error: "Select at least one option to vote." };
  }

  if (!allowMultiple && optionIds.length > 1) {
    return { valid: false, error: "This poll only allows one choice." };
  }

  const uniqueIds = new Set(optionIds);
  if (uniqueIds.size !== optionIds.length) {
    return { valid: false, error: "Duplicate options selected." };
  }

  const validSet = new Set(validOptionIds);
  if (optionIds.some((id) => !validSet.has(id))) {
    return { valid: false, error: "Invalid poll option selected." };
  }

  return { valid: true };
}
