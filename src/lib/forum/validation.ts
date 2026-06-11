import { stripBBCode } from "@/lib/bbcode";

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

const MIN_TITLE_LENGTH = 5;
const MAX_TITLE_LENGTH = 200;
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 50000;

export function validateThreadTitle(title: string): ValidationResult {
  const trimmed = title.trim();

  if (!trimmed) {
    return { valid: false, error: "Title is required." };
  }

  if (trimmed.length < MIN_TITLE_LENGTH) {
    return {
      valid: false,
      error: `Title must be at least ${MIN_TITLE_LENGTH} characters.`,
    };
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    return {
      valid: false,
      error: `Title must be at most ${MAX_TITLE_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

export function validatePostContent(content: string): ValidationResult {
  const trimmed = content.trim();

  if (!trimmed) {
    return { valid: false, error: "Content is required." };
  }

  const meaningfulLength = stripBBCode(trimmed).trim().length;
  if (meaningfulLength < MIN_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `Content must be at least ${MIN_CONTENT_LENGTH} characters.`,
    };
  }

  if (trimmed.length > MAX_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `Content must be at most ${MAX_CONTENT_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

export function validateReplyContent(content: string): ValidationResult {
  const trimmed = content.trim();

  if (!trimmed) {
    return { valid: false, error: "Reply cannot be empty." };
  }

  if (trimmed.length > MAX_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `Reply must be at most ${MAX_CONTENT_LENGTH} characters.`,
    };
  }

  return { valid: true };
}
