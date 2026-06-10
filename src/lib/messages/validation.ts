import { hasNonQuoteContent } from "@/lib/quoteParser";

const MIN_SUBJECT_LENGTH = 5;
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 10000;

export function validateMessageSubject(subject: string): {
  valid: true;
  value: string;
} | {
  valid: false;
  error: string;
} {
  const trimmed = subject.trim();

  if (!trimmed) {
    return { valid: false, error: "Subject is required." };
  }

  if (trimmed.length < MIN_SUBJECT_LENGTH) {
    return {
      valid: false,
      error: `Subject must be at least ${MIN_SUBJECT_LENGTH} characters.`,
    };
  }

  if (trimmed.length > MAX_SUBJECT_LENGTH) {
    return {
      valid: false,
      error: `Subject must be at most ${MAX_SUBJECT_LENGTH} characters.`,
    };
  }

  return { valid: true, value: trimmed };
}

export function validateMessageContent(content: string): {
  valid: true;
  value: string;
} | {
  valid: false;
  error: string;
} {
  const trimmed = content.trim();

  if (trimmed.length < 1) {
    return { valid: false, error: "Message cannot be empty." };
  }

  if (!hasNonQuoteContent(trimmed)) {
    return {
      valid: false,
      error: "Message must include your own text, not just a quote.",
    };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  return { valid: true, value: trimmed };
}

export function normalizeRecipientUsername(username: string): string {
  return username.trim().toLowerCase();
}
