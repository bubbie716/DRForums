import { slugify } from "@/lib/slug";
import type { ValidationResult } from "@/lib/auth";

const MAX_NAME_LENGTH = 100;
const MAX_SLUG_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;

export function validateAdminName(name: string, label: string): ValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: `${label} is required.` };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `${label} must be at most ${MAX_NAME_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

export function validateAdminSlug(slug: string, label: string): ValidationResult {
  const trimmed = slug.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, error: `${label} is required.` };
  }

  if (trimmed.length > MAX_SLUG_LENGTH) {
    return {
      valid: false,
      error: `${label} must be at most ${MAX_SLUG_LENGTH} characters.`,
    };
  }

  if (trimmed !== slugify(trimmed)) {
    return {
      valid: false,
      error: `${label} can only use lowercase letters, numbers, and hyphens.`,
    };
  }

  return { valid: true };
}

export function validateAdminDescription(
  description: string | null | undefined
): ValidationResult {
  if (!description) {
    return { valid: true };
  }

  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    return {
      valid: false,
      error: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

export function validateSortOrder(sortOrder: number): ValidationResult {
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    return {
      valid: false,
      error: "Sort order must be a non-negative whole number.",
    };
  }

  return { valid: true };
}

export function normalizeAdminSlug(value: string): string {
  return slugify(value);
}
