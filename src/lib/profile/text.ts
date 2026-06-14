import { stripBBCode } from "@/lib/bbcode";

export const SIGNATURE_MAX_LENGTH = 300;
export const PROFILE_TEXT_RAW_MAX_LENGTH = 5000;

export function normalizeProfileText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\0/g, "").trim();
}

export function getProfileTextLength(value: string): number {
  return stripBBCode(normalizeProfileText(value)).length;
}

export function isValidProfileTextLength(
  value: string,
  maxLength: number
): boolean {
  const normalized = normalizeProfileText(value);
  if (normalized.length > PROFILE_TEXT_RAW_MAX_LENGTH) {
    return false;
  }
  return getProfileTextLength(value) <= maxLength;
}
