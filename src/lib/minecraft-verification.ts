import { randomInt } from "crypto";

export const CODE_PREFIX = "DRP-";
export const CODE_EXPIRY_MINUTES = 10;
const CODE_PATTERN = /^DRP-\d{6}$/;
const MINECRAFT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MINECRAFT_USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,16}$/;

export function normalizeMinecraftUuid(uuid: string): string | null {
  const trimmed = uuid.trim().toLowerCase();
  const withoutDashes = trimmed.replace(/-/g, "");

  if (!/^[0-9a-f]{32}$/.test(withoutDashes)) {
    return null;
  }

  return [
    withoutDashes.slice(0, 8),
    withoutDashes.slice(8, 12),
    withoutDashes.slice(12, 16),
    withoutDashes.slice(16, 20),
    withoutDashes.slice(20, 32),
  ].join("-");
}

export function validateMinecraftUuid(uuid: string): boolean {
  const normalized = normalizeMinecraftUuid(uuid);
  return normalized !== null && MINECRAFT_UUID_PATTERN.test(normalized);
}

export function validateMinecraftUsername(username: string): boolean {
  return MINECRAFT_USERNAME_PATTERN.test(username.trim());
}

export function normalizeVerificationCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidVerificationCodeFormat(code: string): boolean {
  return CODE_PATTERN.test(normalizeVerificationCode(code));
}

export function generateVerificationCode(): string {
  const digits = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return `${CODE_PREFIX}${digits}`;
}

export function getCodeExpiryDate(): Date {
  return new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
}

export function verifyPluginApiKey(authorizationHeader: string | null): boolean {
  const apiKey = process.env.MINECRAFT_PLUGIN_API_KEY;

  if (!apiKey || !authorizationHeader) {
    return false;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() === "bearer" && token) {
    return token === apiKey;
  }

  return authorizationHeader === apiKey;
}
