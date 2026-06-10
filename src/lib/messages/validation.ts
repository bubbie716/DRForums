const MAX_MESSAGE_LENGTH = 10000;

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
